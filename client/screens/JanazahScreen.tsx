import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import {
  GeometricCardPattern,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface StepItem {
  title: string;
  description: string;
  arabic?: string;
  transliteration?: string;
  translation?: string;
}

interface Section {
  id: number;
  title: string;
  subtitle: string;
  icon: AppIconName;
  reference: string;
  steps: StepItem[];
}

const SECTIONS: Section[] = [
  {
    id: 1,
    title: "Upon Death",
    subtitle: "When Someone Passes",
    icon: "heart",
    reference: "Sahih Muslim 920",
    steps: [
      {
        title: "Close the Eyes",
        description:
          "Gently close the eyes of the deceased. The Prophet (peace be upon him) said: 'When the soul is taken, the sight follows it.'",
      },
      {
        title: "Tie the Jaw",
        description:
          "Tie the jaw of the deceased with a piece of cloth to keep the mouth closed, wrapping it from under the chin to the top of the head.",
      },
      {
        title: "Cover the Body",
        description:
          "Cover the entire body with a clean sheet or cloth out of respect and dignity for the deceased.",
      },
      {
        title: "Recite the Verse of Return",
        description:
          "Upon hearing of someone's death, Muslims often recite the Quranic words of returning to Allah.",
        arabic:
          "\u0625\u0650\u0646\u0651\u064E\u0627 \u0644\u0650\u0644\u0651\u064E\u0647\u0650 \u0648\u064E\u0625\u0650\u0646\u0651\u064E\u0627 \u0625\u0650\u0644\u064E\u064A\u0652\u0647\u0650 \u0631\u064E\u0627\u062C\u0650\u0639\u064F\u0648\u0646\u064E",
        transliteration: "Inna lillahi wa inna ilayhi raji'un",
        translation: "Indeed, to Allah we belong and to Him we shall return.",
      },
      {
        title: "Dua for the Deceased",
        description:
          "Make supplication asking Allah to forgive the deceased and raise their rank among the guided.",
        arabic:
          "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0627\u063A\u0652\u0641\u0650\u0631\u0652 \u0644\u064E\u0647\u064F \u0648\u064E\u0627\u0631\u0652\u0641\u064E\u0639\u0652 \u062F\u064E\u0631\u064E\u062C\u064E\u062A\u064E\u0647\u064F",
        transliteration: "Allahummaghfir lahu warfa' darajatahu",
        translation: "O Allah, forgive him and raise his rank.",
      },
      {
        title: "Hasten the Preparations",
        description:
          "The Prophet (peace be upon him) said: 'Hasten the funeral, for if the deceased was righteous, you are forwarding them to goodness. And if otherwise, then it is evil you are putting off your necks.'",
      },
    ],
  },
  {
    id: 2,
    title: "Ghusl",
    subtitle: "Washing the Body",
    icon: "droplet",
    reference: "Sahih al-Bukhari 1253",
    steps: [
      {
        title: "Who Can Wash",
        description:
          "The washer should be a trustworthy Muslim of the same gender as the deceased. A spouse may also wash the other. Only those necessary should be present to maintain the dignity of the deceased.",
      },
      {
        title: "Place on Elevated Surface",
        description:
          "Place the body on a clean, elevated surface such as a washing table. Cover the awrah (private area) with a cloth that must remain covered throughout the entire washing process.",
      },
      {
        title: "Make the Intention (Niyyah)",
        description:
          "The washer should make the intention in the heart to perform the ghusl for the deceased for the sake of Allah. Begin by saying Bismillah.",
      },
      {
        title: "Wash Private Parts First",
        description:
          "Using a cloth wrapped around the hand, clean the private parts of the deceased without directly looking at them. Gently press the lower abdomen to expel any remaining waste.",
      },
      {
        title: "Perform Wudu on the Deceased",
        description:
          "Perform ablution (wudu) on the deceased as would be done for prayer - washing the face, arms to the elbows, wiping the head, and washing the feet. Water should not enter the mouth or nose; wipe them with a damp cloth instead.",
      },
      {
        title: "Wash Head and Face",
        description:
          "Wash the head and face of the deceased thoroughly with water and sidr (lote tree leaves) or soap.",
      },
      {
        title: "Wash Right Side Then Left",
        description:
          "Wash the entire body starting from the right side, then the left. Repeat a minimum of three times, or more if needed (always an odd number: 3, 5, or 7).",
      },
      {
        title: "Use Camphor in Final Wash",
        description:
          "In the final wash, add camphor to the water. The Prophet (peace be upon him) said: 'Put camphor in the last washing.' Camphor purifies and preserves the body.",
      },
      {
        title: "Dry the Body",
        description:
          "After the final wash, gently dry the body with a clean cloth. Handle the body with care and respect throughout this process.",
      },
    ],
  },
  {
    id: 3,
    title: "Kafan",
    subtitle: "Shrouding the Body",
    icon: "layers",
    reference: "Sahih al-Bukhari 1264",
    steps: [
      {
        title: "For Men: Three White Cloth Pieces",
        description:
          "A man is shrouded in three white cloths: (1) Izar - a lower wrap from waist to feet. (2) Qamees - a shirt covering the torso. (3) Lifafah - a large wrap covering the entire body from head to toe.",
      },
      {
        title: "For Women: Five Pieces",
        description:
          "A woman is shrouded in five cloths: (1) Izar - lower wrap. (2) Qamees - upper garment. (3) Khimar - head covering. (4) Two Lifafah - full body wraps. The hair is placed over the qamees and covered by the khimar.",
      },
      {
        title: "Apply Perfume and Camphor",
        description:
          "Apply non-alcoholic perfume (such as musk or oud) on cotton and place it at the points of prostration: the forehead, nose, palms, knees, and feet. Camphor may also be applied.",
      },
      {
        title: "Wrap Right Side First",
        description:
          "Spread the lifafah (outer wrap) first, then place the izar on top. Lay the body on the cloths. Wrap the izar around the body. Then fold the lifafah - bring the right side over the body first, then the left side over it.",
      },
      {
        title: "Tie with Strips of Cloth",
        description:
          "Secure the shroud with strips of cloth (ropes) at the head, feet, and middle to keep the wrapping in place. These ties are loosened when the body is placed in the grave.",
      },
    ],
  },
  {
    id: 4,
    title: "Salat al-Janazah",
    subtitle: "The Funeral Prayer",
    icon: "book",
    reference: "Sahih Muslim 963",
    steps: [
      {
        title: "Stand Facing Qibla",
        description:
          "Stand facing the Qibla with the body of the deceased placed in front of the congregation. There is no adhan or iqamah for the funeral prayer.",
      },
      {
        title: "Position of the Imam",
        description:
          "The Imam stands at the head of a male deceased and at the middle (waist area) of a female deceased. The congregation forms rows behind the imam. It is recommended to have three or more rows.",
      },
      {
        title: "First Takbir: Surah Al-Fatihah",
        description:
          "Raise your hands and say 'Allahu Akbar' for the first takbir. Then recite Surah Al-Fatihah silently.",
        arabic:
          "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0646\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650 \u00B7 \u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F \u0644\u0650\u0644\u0651\u064E\u0647\u0650 \u0631\u064E\u0628\u0651\u0650 \u0627\u0644\u0652\u0639\u064E\u0627\u0644\u064E\u0645\u0650\u064A\u0646\u064E \u00B7 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0646\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650 \u00B7 \u0645\u064E\u0627\u0644\u0650\u0643\u0650 \u064A\u064E\u0648\u0652\u0645\u0650 \u0627\u0644\u062F\u0651\u0650\u064A\u0646\u0650 \u00B7 \u0625\u0650\u064A\u0651\u064E\u0627\u0643\u064E \u0646\u064E\u0639\u0652\u0628\u064F\u062F\u064F \u0648\u064E\u0625\u0650\u064A\u0651\u064E\u0627\u0643\u064E \u0646\u064E\u0633\u0652\u062A\u064E\u0639\u0650\u064A\u0646\u064F \u00B7 \u0627\u0647\u0652\u062F\u0650\u0646\u064E\u0627 \u0627\u0644\u0635\u0651\u0650\u0631\u064E\u0627\u0637\u064E \u0627\u0644\u0652\u0645\u064F\u0633\u0652\u062A\u064E\u0642\u0650\u064A\u0645\u064E \u00B7 \u0635\u0650\u0631\u064E\u0627\u0637\u064E \u0627\u0644\u0651\u064E\u0630\u0650\u064A\u0646\u064E \u0623\u064E\u0646\u0652\u0639\u064E\u0645\u0652\u062A\u064E \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652 \u063A\u064E\u064A\u0652\u0631\u0650 \u0627\u0644\u0652\u0645\u064E\u063A\u0652\u0636\u064F\u0648\u0628\u0650 \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652 \u0648\u064E\u0644\u064E\u0627 \u0627\u0644\u0636\u0651\u064E\u0627\u0644\u0651\u0650\u064A\u0646\u064E",
        transliteration:
          "Bismillahir-Rahmanir-Rahim. Al-hamdu lillahi Rabbil-'alamin. Ar-Rahmanir-Rahim. Maliki yawmid-din. Iyyaka na'budu wa iyyaka nasta'in. Ihdinas-siratal-mustaqim. Siratal-ladhina an'amta 'alayhim ghayril-maghdubi 'alayhim walad-dallin.",
        translation:
          "In the name of Allah, the Most Gracious, the Most Merciful. All praise is due to Allah, Lord of all the worlds. The Most Gracious, the Most Merciful. Master of the Day of Judgement. You alone we worship, and You alone we ask for help. Guide us to the straight path. The path of those upon whom You have bestowed favour, not of those who have earned anger nor of those who are astray.",
      },
      {
        title: "Second Takbir: Salawat on the Prophet",
        description:
          "Say 'Allahu Akbar' for the second takbir. Then send blessings upon the Prophet Muhammad (peace be upon him).",
        arabic:
          "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0635\u064E\u0644\u0651\u0650 \u0639\u064E\u0644\u064E\u0649 \u0645\u064F\u062D\u064E\u0645\u0651\u064E\u062F\u064D \u0648\u064E\u0639\u064E\u0644\u064E\u0649 \u0622\u0644\u0650 \u0645\u064F\u062D\u064E\u0645\u0651\u064E\u062F\u064D",
        transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad",
        translation:
          "O Allah, send blessings upon Muhammad and upon the family of Muhammad.",
      },
      {
        title: "Third Takbir: Dua for the Deceased",
        description:
          "Say 'Allahu Akbar' for the third takbir. Then make sincere supplication for the deceased using the authentic dua taught by the Prophet (peace be upon him).",
        arabic:
          "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0627\u063A\u0652\u0641\u0650\u0631\u0652 \u0644\u064E\u0647\u064F \u0648\u064E\u0627\u0631\u0652\u062D\u064E\u0645\u0652\u0647\u064F \u0648\u064E\u0639\u064E\u0627\u0641\u0650\u0647\u0650 \u0648\u064E\u0627\u0639\u0652\u0641\u064F \u0639\u064E\u0646\u0652\u0647\u064F \u0648\u064E\u0623\u064E\u0643\u0652\u0631\u0650\u0645\u0652 \u0646\u064F\u0632\u064F\u0644\u064E\u0647\u064F \u0648\u064E\u0648\u064E\u0633\u0651\u0650\u0639\u0652 \u0645\u064F\u062F\u0652\u062E\u064E\u0644\u064E\u0647\u064F \u0648\u064E\u0627\u063A\u0652\u0633\u0650\u0644\u0652\u0647\u064F \u0628\u0650\u0627\u0644\u0652\u0645\u064E\u0627\u0621\u0650 \u0648\u064E\u0627\u0644\u062B\u0651\u064E\u0644\u0652\u062C\u0650 \u0648\u064E\u0627\u0644\u0652\u0628\u064E\u0631\u064E\u062F\u0650",
        transliteration:
          "Allahummaghfir lahu warhamhu wa 'afihi wa'fu 'anhu wa akrim nuzulahu wa wassi' mudkhalahu waghsilhu bil-ma'i wath-thalji wal-barad",
        translation:
          "O Allah, forgive him and have mercy on him, grant him well-being and pardon him, honour his reception and widen his entrance, and wash him with water, snow and hail.",
      },
      {
        title: "Fourth Takbir: Final Dua and Salam",
        description:
          "Say 'Allahu Akbar' for the fourth and final takbir. Make a brief supplication, then end the prayer with one salam to the right. There is no ruku (bowing) or sujud (prostration) in this prayer.",
        arabic:
          "\u0627\u0644\u0633\u0651\u064E\u0644\u064E\u0627\u0645\u064F \u0639\u064E\u0644\u064E\u064A\u0652\u0643\u064F\u0645\u0652 \u0648\u064E\u0631\u064E\u062D\u0652\u0645\u064E\u0629\u064F \u0627\u0644\u0644\u0651\u064E\u0647\u0650",
        transliteration: "As-salamu 'alaykum wa rahmatullah",
        translation: "Peace be upon you and the mercy of Allah.",
      },
    ],
  },
  {
    id: 5,
    title: "Burial (Dafn)",
    subtitle: "Laying to Rest",
    icon: "map-pin",
    reference: "Sunan Abu Dawud 3213",
    steps: [
      {
        title: "Carry the Body Respectfully",
        description:
          "Carry the body to the grave with respect and dignity. It is sunnah for those present to take turns carrying the bier on their shoulders. Walk briskly but without running.",
      },
      {
        title: "Lower into the Grave",
        description:
          "Lower the body into the grave on the right side, facing the direction of the Qibla (Makkah). Those lowering the body should recite the prescribed supplication.",
        arabic:
          "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0648\u064E\u0639\u064E\u0644\u064E\u0649 \u0633\u064F\u0646\u0651\u064E\u0629\u0650 \u0631\u064E\u0633\u064F\u0648\u0644\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650",
        transliteration: "Bismillahi wa 'ala sunnati Rasulillah",
        translation:
          "In the name of Allah and upon the way of the Messenger of Allah.",
      },
      {
        title: "Place Dirt",
        description:
          "Each person present should throw three handfuls of soil into the grave. This is a sunnah practice that all attendees may participate in.",
      },
      {
        title: "Raise the Grave Slightly",
        description:
          "The grave should be raised slightly above ground level (about a hand span) in a mound shape so that it is recognised and not disrespected. It is prohibited to build structures or plaster over graves.",
      },
      {
        title: "Make Dua for the Deceased",
        description:
          "After the burial is complete, stand at the grave and make supplication for the deceased, asking Allah to forgive them and make them steadfast during the questioning.",
      },
    ],
  },
  {
    id: 6,
    title: "After Burial",
    subtitle: "Post-Burial Practices",
    icon: "sunrise",
    reference: "Sunan Abu Dawud 3221",
    steps: [
      {
        title: "Make Dua for the Deceased",
        description:
          "The Prophet (peace be upon him) would stand at the grave after burial and say: 'Ask forgiveness for your brother and ask that he be made steadfast, for he is now being questioned.'",
        arabic:
          "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0627\u063A\u0652\u0641\u0650\u0631\u0652 \u0644\u064E\u0647\u064F \u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u062B\u064E\u0628\u0651\u0650\u062A\u0652\u0647\u064F",
        transliteration: "Allahummaghfir lahu, Allahumma thabbithu",
        translation: "O Allah, forgive him. O Allah, make him steadfast.",
      },
      {
        title: "Visit the Grave",
        description:
          "Visiting graves is recommended as it reminds one of the Hereafter. The Prophet (peace be upon him) said: 'Visit the graves, for they remind you of the Hereafter.'",
      },
      {
        title: "Give Sadaqah",
        description:
          "Giving charity on behalf of the deceased is discussed in the Sunnah and by scholars. Ask a qualified scholar for family-specific questions about ongoing charity, debts, vows, or estate matters.",
      },
      {
        title: "Patience and Seeking Reward",
        description:
          "Exercise patience (sabr) and seek reward from Allah. The Prophet (peace be upon him) said: 'No Muslim is afflicted with a hardship, sickness, sadness, worry, harm, or distress, not even a thorn that pricks them, except that Allah will expiate their sins because of it.'",
      },
    ],
  },
];

export default function JanazahScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(),
  );

  const emerald = isDark ? CategoryColors.emerald.dark : CategoryColors.emerald;

  const toggleSection = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed ? { opacity: 0.6 } : undefined,
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3" style={styles.headerTitle}>
          Janazah Guide
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={isDark ? ["#1E3A5F", "#1A2332"] : ["#EFF6FF", "#DBEAFE"]}
            style={styles.noteCard}
          >
            <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
            <View style={styles.noteHeader}>
              <AppIcon
                name="info"
                size={16}
                color={isDark ? "#60A5FA" : "#2563EB"}
              />
              <ThemedText
                style={[
                  styles.noteLabel,
                  { color: isDark ? "#60A5FA" : "#2563EB" },
                ]}
              >
                Important Note
              </ThemedText>
            </View>
            <ThemedText
              type="small"
              style={[
                styles.noteText,
                { color: isDark ? "#93C5FD" : "#1E40AF" },
              ]}
            >
              This guide covers the essential steps of Islamic funeral rites.
              Consult a local scholar for specific madhab rulings.
            </ThemedText>
          </LinearGradient>
        </Animated.View>

        {SECTIONS.map((section, sectionIndex) => {
          const isExpanded = expandedSections.has(section.id);
          return (
            <Animated.View
              key={section.id}
              entering={FadeInDown.delay(sectionIndex * 60).duration(300)}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.sectionHeader,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                  pressed ? { opacity: 0.8 } : undefined,
                ]}
                onPress={() => toggleSection(section.id)}
                testID={`section-${section.id}`}
              >
                <GeometricCardPattern color={theme.scholar} opacity={0.012} />
                <View
                  style={[styles.sectionBadge, { backgroundColor: emerald.bg }]}
                >
                  <ThemedText
                    type="caption"
                    style={[styles.sectionBadgeText, { color: emerald.text }]}
                  >
                    {section.id}
                  </ThemedText>
                </View>
                <View style={styles.sectionTitleContainer}>
                  <ThemedText type="h4">{section.title}</ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    {section.subtitle}
                  </ThemedText>
                </View>
                <AppIcon
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>

              {isExpanded ? (
                <View style={styles.stepsContainer}>
                  {section.steps.map((step, stepIndex) => (
                    <View
                      key={stepIndex}
                      style={[
                        styles.stepCard,
                        {
                          backgroundColor: theme.surfaceGlass,
                          borderColor: theme.borderSubtle,
                          borderLeftWidth: 4,
                          borderLeftColor: emerald.text,
                        },
                      ]}
                    >
                      <GeometricCardPattern
                        color={emerald.text}
                        opacity={0.012}
                      />
                      <View style={styles.stepHeader}>
                        <View
                          style={[
                            styles.stepNumberBadge,
                            { backgroundColor: emerald.bg },
                          ]}
                        >
                          <ThemedText
                            type="caption"
                            style={{
                              color: emerald.text,
                              fontWeight: "700",
                            }}
                          >
                            {stepIndex + 1}
                          </ThemedText>
                        </View>
                        <ThemedText type="h4" style={styles.stepTitle}>
                          {step.title}
                        </ThemedText>
                      </View>

                      <ThemedText
                        type="small"
                        style={[
                          styles.stepDescription,
                          { color: theme.textSecondary },
                        ]}
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
                            style={[
                              styles.arabicText,
                              { color: theme.primary },
                            ]}
                          >
                            {step.arabic}
                          </ThemedText>

                          {step.transliteration ? (
                            <>
                              <View
                                style={[
                                  styles.divider,
                                  { backgroundColor: theme.borderSubtle },
                                ]}
                              />
                              <ThemedText
                                type="small"
                                style={[
                                  styles.transliterationText,
                                  {
                                    color: isDark ? "#A78BFA" : "#7C3AED",
                                  },
                                ]}
                              >
                                {step.transliteration}
                              </ThemedText>
                            </>
                          ) : null}

                          {step.translation ? (
                            <>
                              <View
                                style={[
                                  styles.divider,
                                  { backgroundColor: theme.borderSubtle },
                                ]}
                              />
                              <ThemedText
                                type="small"
                                style={{ color: theme.textSecondary }}
                              >
                                {step.translation}
                              </ThemedText>
                            </>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ))}

                  <View
                    style={[
                      styles.refBadge,
                      { backgroundColor: `${theme.textMuted}15` },
                    ]}
                  >
                    <AppIcon
                      name="book-open"
                      size={10}
                      color={theme.textMuted}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {section.reference}
                    </ThemedText>
                  </View>
                </View>
              ) : null}
            </Animated.View>
          );
        })}
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
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    textAlign: "center",
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  noteCard: {
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  noteText: {
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 18,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    overflow: "hidden",
  },
  sectionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBadgeText: {
    fontWeight: "700",
    fontSize: 14,
  },
  sectionTitleContainer: {
    flex: 1,
    gap: 2,
  },
  stepsContainer: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  stepCard: {
    padding: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    flex: 1,
  },
  stepDescription: {
    lineHeight: 20,
    marginLeft: 40,
  },
  arabicContainer: {
    marginTop: Spacing.sm,
    marginLeft: 40,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  arabicText: {
    fontSize: 20,
    textAlign: "right",
    lineHeight: 36,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  transliterationText: {
    fontStyle: "italic",
    lineHeight: 22,
  },
  refBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 20,
    marginLeft: Spacing.sm,
    gap: 4,
  },
});
