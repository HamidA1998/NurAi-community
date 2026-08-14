import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Share } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AppIcon } from "@/components/icons";

interface InspirationItem {
  text: string;
  arabic?: string;
  source: string;
}

const dailyQuotes: InspirationItem[] = [
  { text: "Indeed, Allah is with the patient.", source: "Quran 2:153" },
  {
    text: "And whoever puts their trust in Allah, He will be enough for them.",
    source: "Quran 65:3",
  },
  { text: "Verily, with hardship comes ease.", source: "Quran 94:6" },
  { text: "So remember Me; I will remember you.", source: "Quran 2:152" },
  { text: "And He found you lost and guided you.", source: "Quran 93:7" },
  {
    text: "Allah does not burden a soul beyond that it can bear.",
    source: "Quran 2:286",
  },
  { text: "Cooperate in righteousness and taqwa.", source: "Quran 5:2" },
  { text: "Do not lose hope, nor be sad.", source: "Quran 3:139" },
  { text: "And speak to people good words.", source: "Quran 2:83" },
  { text: "My mercy encompasses all things.", source: "Quran 7:156" },
  {
    text: "Indeed, the mercy of Allah is near to the doers of good.",
    source: "Quran 7:56",
  },
  {
    text: "Those who restrain anger and pardon people are loved by Allah.",
    source: "Quran 3:134",
  },
  {
    text: "And We have certainly made the Quran easy to remember. So is there anyone who will be mindful?",
    source: "Quran 54:17",
  },
  { text: "With Allah is the best return.", source: "Quran 3:14" },
  {
    text: "Indeed, Allah will not change the condition of a people until they change what is in themselves.",
    source: "Quran 13:11",
  },
  { text: "Speak to people good words.", source: "Quran 2:83" },
  {
    text: "And whoever fears Allah, He will make for him a way out.",
    source: "Quran 65:2",
  },
  {
    text: "Those who strive for Us, We will guide them to Our ways.",
    source: "Quran 29:69",
  },
  {
    text: "My Lord, expand for me my chest and ease for me my task.",
    source: "Quran 20:25-26",
  },
  { text: "My Lord, increase me in knowledge.", source: "Quran 20:114" },
  {
    text: "And your Lord says: Call upon Me; I will respond to you.",
    source: "Quran 40:60",
  },
  {
    text: "The most noble of you in Allah's sight is the most righteous.",
    source: "Quran 49:13",
  },
  { text: "He is with you wherever you are.", source: "Quran 57:4" },
  { text: "By time, humanity is in loss.", source: "Quran 103:1-2" },
  {
    text: "Indeed, prayer prohibits immorality and wrongdoing.",
    source: "Quran 29:45",
  },
  {
    text: "The believers are but brothers, so make peace between them.",
    source: "Quran 49:10",
  },
  {
    text: "And We are closer to him than his jugular vein.",
    source: "Quran 50:16",
  },
  {
    text: "Invite to the way of your Lord with wisdom and good instruction.",
    source: "Quran 16:125",
  },
  { text: "My mercy encompasses all things.", source: "Quran 7:156" },
  {
    text: "The life of this world is only the enjoyment of delusion.",
    source: "Quran 3:185",
  },
];

const quranVerses: InspirationItem[] = [
  {
    arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
    text: "Indeed, with hardship comes ease.",
    source: "Quran 94:6",
  },
  {
    arabic: "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ",
    text: "And your Lord is going to give you, and you will be satisfied.",
    source: "Quran 93:5",
  },
  {
    arabic: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
    text: "Indeed, Allah is with the patient.",
    source: "Quran 2:153",
  },
  {
    arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ",
    text: "So remember Me; I will remember you.",
    source: "Quran 2:152",
  },
  {
    arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
    text: "And whoever puts their trust in Allah, He will be enough for them.",
    source: "Quran 65:3",
  },
  {
    arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
    text: "Allah does not burden a soul beyond that it can bear.",
    source: "Quran 2:286",
  },
  {
    arabic: "ادْعُونِي أَسْتَجِبْ لَكُمْ",
    text: "Call upon Me; I will respond to you.",
    source: "Quran 40:60",
  },
  {
    arabic: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ",
    text: "He is with you wherever you are.",
    source: "Quran 57:4",
  },
  {
    arabic: "إِنَّ رَحْمَتَ اللَّهِ قَرِيبٌ مِّنَ الْمُحْسِنِينَ",
    text: "Indeed, the mercy of Allah is near to the doers of good.",
    source: "Quran 7:56",
  },
  {
    arabic: "وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ",
    text: "And We are closer to him than his jugular vein.",
    source: "Quran 50:16",
  },
];

const hadiths: InspirationItem[] = [
  {
    text: "Source anchor for intention and inner purpose behind actions.",
    source: "Sahih al-Bukhari 1",
  },
  {
    text: "Source anchor for keeping small, regular deeds.",
    source: "Sahih al-Bukhari 6464",
  },
  {
    text: "Source anchor for strength through self-control when angry.",
    source: "Sahih al-Bukhari 6114",
  },
  {
    text: "Source anchor for dua as worship.",
    source: "Jami at-Tirmidhi 3372",
  },
  {
    text: "Source anchor for seeking knowledge and paths of goodness.",
    source: "Sahih Muslim 2699a",
  },
  {
    text: "Source anchor for guarding the tongue and hand from harm.",
    source: "Sahih al-Bukhari 10",
  },
];

const scholarlyWisdom: InspirationItem[] = [
  {
    text: "Choose one action from what you learned today and make it real before sleeping.",
    source: "NurAI reflection",
  },
  {
    text: "If a reminder softened your heart, protect that softness with one quiet good deed.",
    source: "NurAI reflection",
  },
  {
    text: "When your heart feels unsettled, return to one ayah, one dhikr, and one honest dua.",
    source: "NurAI reflection",
  },
  {
    text: "Patience today may look like holding your tongue, keeping your prayer, or asking for help.",
    source: "NurAI reflection",
  },
  {
    text: "Let your character be guided by Allah, not by the mood of the people around you.",
    source: "NurAI reflection",
  },
  {
    text: "Purifying the heart often begins with choosing the better thing when no one is watching.",
    source: "NurAI reflection",
  },
  {
    text: "Treat dunya pressure as a test to meet with worship, effort, and perspective.",
    source: "NurAI reflection",
  },
  {
    text: "Ask Allah for a heart that feels rich before asking for a life that looks rich.",
    source: "NurAI reflection",
  },
  {
    text: "A trial does not need a neat explanation before you can respond with patience and dua.",
    source: "NurAI reflection",
  },
  {
    text: "Before anger becomes words, pause long enough to choose the answer you will not regret.",
    source: "NurAI reflection",
  },
];

function ShareButton({ item }: { item: InspirationItem }) {
  const { theme } = useTheme();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `"${item.text}" - ${item.source}`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <Pressable onPress={handleShare} hitSlop={8} testID="button-share">
      <AppIcon name="share-2" size={16} color={theme.textMuted} />
    </Pressable>
  );
}

function InspirationCard({
  item,
  index,
  delay,
  showArabic,
}: {
  item: InspirationItem;
  index: number;
  delay: number;
  showArabic?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(delay + index * 60).duration(400)}
    >
      <View
        style={[
          styles.card,
          {
            borderColor: theme.borderSubtle,
            backgroundColor: theme.surfaceGlass,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardContent}>
            {showArabic && item.arabic ? (
              <ThemedText
                type="body"
                style={{
                  textAlign: "right",
                  fontSize: 22,
                  lineHeight: 36,
                  marginBottom: Spacing.md,
                }}
              >
                {item.arabic}
              </ThemedText>
            ) : null}
            <ThemedText
              type="body"
              style={{ lineHeight: 24, fontStyle: "italic" }}
            >
              "{item.text}"
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
            >
              {item.source}
            </ThemedText>
          </View>
          <ShareButton item={item} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function InspirationScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const todayIndex = new Date().getDate() - 1;
  const todayQuote = dailyQuotes[todayIndex % dailyQuotes.length];

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
          Daily Inspiration
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
            style={styles.featuredCard}
          >
            <View style={styles.featuredHeader}>
              <AppIcon name="sun" size={24} color="rgba(255,255,255,0.8)" />
              <ThemedText
                type="caption"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                Today's Inspiration
              </ThemedText>
            </View>
            <ThemedText
              type="h3"
              style={{
                color: "#FFF",
                marginTop: Spacing.xl,
                fontStyle: "italic",
                lineHeight: 32,
              }}
            >
              "{todayQuote.text}"
            </ThemedText>
            <ThemedText
              type="small"
              style={{
                color: "rgba(255,255,255,0.8)",
                marginTop: Spacing.md,
              }}
            >
              - {todayQuote.source}
            </ThemedText>
            <View style={styles.featuredFooter}>
              <Pressable
                onPress={async () => {
                  try {
                    await Share.share({
                      message: `"${todayQuote.text}" - ${todayQuote.source}`,
                    });
                  } catch {
                    // ignore
                  }
                }}
                style={styles.shareButtonFeatured}
                testID="button-share-featured"
              >
                <AppIcon name="share-2" size={18} color="#FFF" />
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <View style={styles.sectionHeader}>
            <AppIcon name="book-open" size={20} color={theme.gradientStart} />
            <ThemedText type="h3" style={{ marginLeft: Spacing.sm }}>
              Quranic Verses
            </ThemedText>
          </View>
        </Animated.View>

        {quranVerses.map((item, index) => (
          <InspirationCard
            key={`quran-${index}`}
            item={item}
            index={index}
            delay={300}
            showArabic
          />
        ))}

        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <View style={styles.sectionHeader}>
            <AppIcon name="star" size={20} color="#D97706" />
            <ThemedText type="h3" style={{ marginLeft: Spacing.sm }}>
              Verified Hadith Anchors
            </ThemedText>
          </View>
        </Animated.View>

        {hadiths.map((item, index) => (
          <InspirationCard
            key={`hadith-${index}`}
            item={item}
            index={index}
            delay={500}
          />
        ))}

        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <View style={styles.sectionHeader}>
            <AppIcon name="feather" size={20} color="#7C3AED" />
            <ThemedText type="h3" style={{ marginLeft: Spacing.sm }}>
              Reflection Prompts
            </ThemedText>
          </View>
        </Animated.View>

        {scholarlyWisdom.map((item, index) => (
          <InspirationCard
            key={`scholar-${index}`}
            item={item}
            index={index}
            delay={700}
          />
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
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    textAlign: "center",
    flex: 1,
  },
  featuredCard: {
    borderRadius: 24,
    padding: Spacing["3xl"],
    marginBottom: Spacing.xl,
  },
  featuredHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  featuredFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: Spacing.xl,
  },
  shareButtonFeatured: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
});
