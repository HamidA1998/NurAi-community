import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  CrescentMark,
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon } from "@/components/icons";

type Era =
  | "prophetic"
  | "rashidun"
  | "umayyad"
  | "abbasid"
  | "ottoman"
  | "modern";

interface TimelineEvent {
  year: string;
  title: string;
  description: string;
  era: Era;
}

const eraColors: Record<
  Era,
  { bg: string; text: string; darkBg: string; darkText: string }
> = {
  prophetic: {
    bg: "#ECFDF5",
    text: "#059669",
    darkBg: "#064E3B",
    darkText: "#10B981",
  },
  rashidun: {
    bg: "#EFF6FF",
    text: "#2563EB",
    darkBg: "#1E3A5F",
    darkText: "#60A5FA",
  },
  umayyad: {
    bg: "#FFFBEB",
    text: "#D97706",
    darkBg: "#451A03",
    darkText: "#FBBF24",
  },
  abbasid: {
    bg: "#FAF5FF",
    text: "#7C3AED",
    darkBg: "#2E1065",
    darkText: "#A78BFA",
  },
  ottoman: {
    bg: "#F0FDFA",
    text: "#0D9488",
    darkBg: "#042F2E",
    darkText: "#2DD4BF",
  },
  modern: {
    bg: "#F1F4F9",
    text: "#475569",
    darkBg: "#334155",
    darkText: "#8B99AB",
  },
};

const eraLabels: Record<Era, string> = {
  prophetic: "Prophetic Era",
  rashidun: "Rashidun Era",
  umayyad: "Umayyad Era",
  abbasid: "Abbasid Era",
  ottoman: "Ottoman Era",
  modern: "Modern Era",
};

const timelineEvents: TimelineEvent[] = [
  {
    year: "570 CE",
    title: "Birth of Prophet Muhammad",
    description:
      "Prophet Muhammad (peace be upon him) was born in Makkah in the Year of the Elephant. He was raised by his grandfather Abdul Muttalib and uncle Abu Talib.",
    era: "prophetic",
  },
  {
    year: "610 CE",
    title: "First Revelation in Cave Hira",
    description:
      "Angel Jibreel appeared to Prophet Muhammad in Cave Hira and revealed the first verses of Surah Al-Alaq, marking the beginning of prophethood.",
    era: "prophetic",
  },
  {
    year: "613 CE",
    title: "Public Preaching Begins in Makkah",
    description:
      "After three years of secret dawah, the Prophet was commanded to preach Islam publicly. The Quraysh began their persecution of early Muslims.",
    era: "prophetic",
  },
  {
    year: "615 CE",
    title: "First Migration to Abyssinia",
    description:
      "A group of Muslims migrated to Abyssinia (modern-day Ethiopia) to escape persecution, finding refuge under the just Christian king, Negus.",
    era: "prophetic",
  },
  {
    year: "619 CE",
    title: "Year of Sorrow",
    description:
      "The Prophet lost both his beloved wife Khadijah and his uncle Abu Talib, who had been his protector. This was one of the most difficult periods of his life.",
    era: "prophetic",
  },
  {
    year: "620 CE",
    title: "Isra and Mi'raj (Night Journey)",
    description:
      "The miraculous night journey from Makkah to Jerusalem and ascension through the heavens, where the five daily prayers were ordained.",
    era: "prophetic",
  },
  {
    year: "622 CE",
    title: "Hijrah to Madinah",
    description:
      "The Prophet and his companions migrated to Madinah, establishing the first Islamic state. This event marks the beginning of the Islamic calendar.",
    era: "prophetic",
  },
  {
    year: "624 CE",
    title: "Battle of Badr",
    description:
      "The first major battle in Islam where 313 Muslims achieved a decisive victory against over 1,000 Quraysh fighters, with divine assistance.",
    era: "prophetic",
  },
  {
    year: "625 CE",
    title: "Battle of Uhud",
    description:
      "A challenging battle near Mount Uhud where Muslims initially gained the upper hand but suffered losses when archers left their positions.",
    era: "prophetic",
  },
  {
    year: "627 CE",
    title: "Battle of the Trench",
    description:
      "A coalition of 10,000 fighters besieged Madinah. Muslims dug a trench around the city on Salman al-Farisi's advice, successfully defending it.",
    era: "prophetic",
  },
  {
    year: "628 CE",
    title: "Treaty of Hudaybiyyah",
    description:
      "A pivotal peace treaty between Muslims and Quraysh that allowed Muslims to perform Umrah the following year and led to rapid spread of Islam.",
    era: "prophetic",
  },
  {
    year: "630 CE",
    title: "Conquest of Makkah",
    description:
      "The peaceful conquest of Makkah where the Prophet entered the city with 10,000 companions, cleansed the Kaaba of idols, and forgave his former enemies.",
    era: "prophetic",
  },
  {
    year: "632 CE",
    title: "Farewell Pilgrimage & Passing of the Prophet",
    description:
      "The Prophet performed his final Hajj, delivering the Farewell Sermon at Arafah. He passed away shortly after in Madinah at the age of 63.",
    era: "prophetic",
  },
  {
    year: "632-661 CE",
    title: "Era of Rashidun Caliphs",
    description:
      "The era of the four rightly guided caliphs: Abu Bakr, Umar, Uthman, and Ali. Islam spread across Arabia, Persia, and parts of the Byzantine Empire.",
    era: "rashidun",
  },
  {
    year: "661-750 CE",
    title: "Umayyad Caliphate",
    description:
      "The Umayyad dynasty expanded the Islamic empire from Spain to Central Asia, establishing Damascus as the capital and building the Dome of the Rock.",
    era: "umayyad",
  },
  {
    year: "711 CE",
    title: "Islamic Civilization in Spain (Al-Andalus)",
    description:
      "Muslims entered the Iberian Peninsula, establishing Al-Andalus - a center of learning, science, and culture that flourished for nearly 800 years.",
    era: "umayyad",
  },
  {
    year: "750-1258 CE",
    title: "Abbasid Caliphate (Golden Age of Islam)",
    description:
      "The Abbasid era saw unprecedented advances in science, mathematics, medicine, and philosophy. Baghdad became the world's leading center of knowledge.",
    era: "abbasid",
  },
  {
    year: "1099-1291 CE",
    title: "Crusades Period",
    description:
      "A series of religious wars where European Crusaders fought to control the Holy Land. Salahuddin al-Ayyubi recaptured Jerusalem in 1187 CE.",
    era: "abbasid",
  },
  {
    year: "1453 CE",
    title: "Ottoman Conquest of Constantinople",
    description:
      "Sultan Mehmed II conquered Constantinople (modern Istanbul), ending the Byzantine Empire and establishing it as the Ottoman capital.",
    era: "ottoman",
  },
  {
    year: "1932 CE",
    title: "Kingdom of Saudi Arabia Established",
    description:
      "King Abdulaziz ibn Saud unified the Arabian Peninsula and established the Kingdom of Saudi Arabia, becoming custodian of the Two Holy Mosques.",
    era: "modern",
  },
];

export default function TimelineScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3" style={styles.headerTitle}>
          Islamic Timeline
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <LinearGradient
            colors={[theme.gradientStart, theme.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
            <CrescentMark size={42} color="#FFF" accentColor={theme.scholar} />
            <ThemedText
              type="h3"
              style={{
                color: "#FFF",
                marginTop: Spacing.md,
                textAlign: "center",
              }}
            >
              Journey Through Islamic History
            </ThemedText>
            <GoldDivider
              color={theme.scholar}
              opacity={0.58}
              style={styles.heroDivider}
            />
            <ThemedText
              type="small"
              style={{
                color: "rgba(255,255,255,0.9)",
                marginTop: Spacing.sm,
                textAlign: "center",
              }}
            >
              From the birth of the Prophet to the modern era
            </ThemedText>
          </LinearGradient>
        </Animated.View>

        <View style={styles.legendRow}>
          {(Object.keys(eraLabels) as Era[]).map((era) => {
            const color = isDark
              ? eraColors[era].darkText
              : eraColors[era].text;
            return (
              <View key={era} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  {eraLabels[era]}
                </ThemedText>
              </View>
            );
          })}
        </View>

        <View style={styles.timeline}>
          {timelineEvents.map((event, index) => {
            const color = isDark
              ? eraColors[event.era].darkText
              : eraColors[event.era].text;
            const bgColor = isDark
              ? eraColors[event.era].darkBg
              : eraColors[event.era].bg;

            return (
              <Animated.View
                key={index}
                entering={FadeInDown.delay(200 + index * 60).duration(400)}
              >
                <View style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[styles.timelineDot, { backgroundColor: color }]}
                    />
                    {index < timelineEvents.length - 1 ? (
                      <View
                        style={[
                          styles.timelineLine,
                          { backgroundColor: theme.borderSubtle },
                        ]}
                      />
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.timelineCard,
                      {
                        borderColor: theme.borderSubtle,
                        backgroundColor: theme.surfaceGlass,
                      },
                    ]}
                  >
                    <GeometricCardPattern
                      color={theme.scholar}
                      opacity={0.012}
                    />
                    <View
                      style={[styles.yearBadge, { backgroundColor: bgColor }]}
                    >
                      <ThemedText
                        type="caption"
                        style={{ color, fontWeight: "700" }}
                      >
                        {event.year}
                      </ThemedText>
                    </View>
                    <ThemedText type="h4" style={{ marginTop: Spacing.sm }}>
                      {event.title}
                    </ThemedText>
                    <GoldDivider
                      color={theme.scholar}
                      opacity={0.18}
                      style={styles.eventDivider}
                    />
                    <ThemedText
                      type="small"
                      style={{
                        color: theme.textSecondary,
                        marginTop: Spacing.xs,
                        lineHeight: 22,
                      }}
                    >
                      {event.description}
                    </ThemedText>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
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
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    textAlign: "center",
    flex: 1,
  },
  heroCard: {
    borderRadius: 24,
    padding: Spacing["3xl"],
    alignItems: "center",
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  heroDivider: {
    width: "70%",
    marginTop: Spacing.sm,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeline: {
    paddingLeft: Spacing.xs,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  timelineLeft: {
    width: 24,
    alignItems: "center",
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: -2,
  },
  timelineCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginLeft: Spacing.md,
    overflow: "hidden",
  },
  eventDivider: {
    marginTop: Spacing.xs,
  },
  yearBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
});
