import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
  ScholarCrownSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon } from "@/components/icons";

type FieldKey =
  | "Fiqh"
  | "Hadith"
  | "Tafsir"
  | "Theology"
  | "Spirituality"
  | "History";

const FIELD_COLORS: Record<FieldKey, string> = {
  Fiqh: "green",
  Hadith: "blue",
  Tafsir: "purple",
  Theology: "amber",
  Spirituality: "teal",
  History: "rose",
};

const SCHOLARS = [
  {
    id: 1,
    name: "Imam Abu Hanifa",
    arabic:
      "\u0625\u0645\u0627\u0645 \u0623\u0628\u0648 \u062D\u0646\u064A\u0641\u0629",
    era: "699-767 CE",
    field: "Fiqh" as FieldKey,
    contribution:
      "Founder of the Hanafi school, the most widely followed school of Islamic jurisprudence.",
    biography:
      "Abu Hanifa al-Nu'man ibn Thabit was born in Kufa, Iraq. He was a prosperous silk merchant who devoted his life to Islamic scholarship. He is known as 'Al-Imam al-A'zam' (The Greatest Imam). He developed a systematic methodology for deriving Islamic law using analogy (qiyas) and juristic preference (istihsan). His school of thought spread throughout the Ottoman Empire and remains the most followed madhab globally, with adherents in Turkey, Central Asia, South Asia, and the Balkans.",
  },
  {
    id: 2,
    name: "Imam Malik",
    arabic: "\u0625\u0645\u0627\u0645 \u0645\u0627\u0644\u0643",
    era: "711-795 CE",
    field: "Fiqh" as FieldKey,
    contribution:
      "Founder of the Maliki school, author of Al-Muwatta, one of the earliest hadith collections.",
    biography:
      "Malik ibn Anas was born and lived his entire life in Madinah. He is known as 'Imam Dar al-Hijrah' (Imam of the Abode of Migration). His magnum opus, Al-Muwatta, is one of the earliest compilations of hadith and Islamic law. He emphasized the practice of the people of Madinah as a source of Islamic jurisprudence. His school is predominant in North Africa, West Africa, and parts of the Arabian Peninsula. He was known for his deep reverence for hadith, never narrating them except in a state of purity.",
  },
  {
    id: 3,
    name: "Imam Ash-Shafi'i",
    arabic:
      "\u0625\u0645\u0627\u0645 \u0627\u0644\u0634\u0627\u0641\u0639\u064A",
    era: "767-820 CE",
    field: "Fiqh" as FieldKey,
    contribution:
      "Founder of the Shafi'i school, systematized Islamic legal theory (Usul al-Fiqh).",
    biography:
      "Muhammad ibn Idris al-Shafi'i was born in Gaza and grew up in Makkah. He studied under Imam Malik in Madinah and was influenced by the Iraqi school of Abu Hanifa. He is known as the 'Father of Usul al-Fiqh' for his groundbreaking work 'Al-Risala,' which established the methodology for deriving Islamic law from its sources. His school is predominant in Southeast Asia, East Africa, Egypt, and Yemen. He was also renowned as a poet and linguist of the Arabic language.",
  },
  {
    id: 4,
    name: "Imam Ahmad ibn Hanbal",
    arabic:
      "\u0625\u0645\u0627\u0645 \u0623\u062D\u0645\u062F \u0628\u0646 \u062D\u0646\u0628\u0644",
    era: "780-855 CE",
    field: "Hadith" as FieldKey,
    contribution:
      "Founder of the Hanbali school, compiled the Musnad with over 28,000 hadith.",
    biography:
      "Ahmad ibn Muhammad ibn Hanbal was born in Baghdad. He is renowned for his vast knowledge of hadith and compiled the Musnad, one of the largest hadith collections with over 28,000 narrations. He endured severe persecution during the Mihna (Inquisition) for refusing to accept the Mu'tazili doctrine that the Quran was created, standing firm on the belief that it is the uncreated word of Allah. His steadfastness earned him the title 'Imam Ahl al-Sunnah.' His school is predominant in Saudi Arabia and Qatar.",
  },
  {
    id: 5,
    name: "Imam Al-Bukhari",
    arabic:
      "\u0625\u0645\u0627\u0645 \u0627\u0644\u0628\u062E\u0627\u0631\u064A",
    era: "810-870 CE",
    field: "Hadith" as FieldKey,
    contribution:
      "Compiled Sahih al-Bukhari, considered the most authentic book after the Quran.",
    biography:
      "Muhammad ibn Ismail al-Bukhari was born in Bukhara (modern-day Uzbekistan). He began memorizing hadith at a young age and traveled extensively across the Islamic world to collect them. His masterwork, Sahih al-Bukhari, took 16 years to compile, selecting approximately 7,563 hadith from over 600,000 narrations. He applied the most rigorous criteria for authentication in hadith history. His collection is universally regarded by Sunni Muslims as the most authentic book after the Quran.",
  },
  {
    id: 6,
    name: "Imam Muslim",
    arabic: "\u0625\u0645\u0627\u0645 \u0645\u0633\u0644\u0645",
    era: "815-875 CE",
    field: "Hadith" as FieldKey,
    contribution:
      "Compiled Sahih Muslim, the second most authentic hadith collection.",
    biography:
      "Muslim ibn al-Hajjaj was born in Nishapur, Iran. He was a student of Imam al-Bukhari and compiled the second most authentic hadith collection, Sahih Muslim. He selected approximately 5,362 hadith from 300,000 narrations. His collection is praised for its superior organization and arrangement of hadith by topic. He was particularly meticulous in documenting the chains of narration. Together with Sahih al-Bukhari, his work forms what is known as the 'Sahihayn' (The Two Authentic Collections).",
  },
  {
    id: 7,
    name: "Imam Al-Ghazali",
    arabic:
      "\u0625\u0645\u0627\u0645 \u0627\u0644\u063A\u0632\u0627\u0644\u064A",
    era: "1058-1111 CE",
    field: "Spirituality" as FieldKey,
    contribution:
      "Author of Ihya Ulum al-Din, bridged Islamic law with spiritual purification.",
    biography:
      "Abu Hamid Muhammad al-Ghazali was born in Tus, Iran. Known as 'Hujjat al-Islam' (Proof of Islam), he is one of the most influential Islamic scholars in history. He served as a professor at the prestigious Nizamiyyah university in Baghdad before undergoing a spiritual crisis that led him to Sufism. His magnum opus, Ihya Ulum al-Din (Revival of Religious Sciences), is a comprehensive guide that harmonizes Islamic jurisprudence, theology, and spiritual purification. His work 'Tahafut al-Falasifah' challenged Greek philosophical influences in Islamic thought.",
  },
  {
    id: 8,
    name: "Ibn Taymiyyah",
    arabic: "\u0627\u0628\u0646 \u062A\u064A\u0645\u064A\u0629",
    era: "1263-1328 CE",
    field: "Theology" as FieldKey,
    contribution:
      "Influential Islamic reformer, prolific writer on theology, law, and philosophy.",
    biography:
      "Taqi al-Din Ahmad ibn Taymiyyah was born in Harran and grew up in Damascus. He was a scholar of extraordinary breadth, writing on theology, jurisprudence, Quranic exegesis, and philosophy. He called for a return to the Quran and Sunnah as the primary sources of Islamic guidance. He was imprisoned multiple times for his controversial opinions but continued writing even in prison. His works have had a profound influence on Islamic reform movements. He authored hundreds of books and treatises during his lifetime.",
  },
  {
    id: 9,
    name: "Imam An-Nawawi",
    arabic: "\u0625\u0645\u0627\u0645 \u0627\u0644\u0646\u0648\u0648\u064A",
    era: "1233-1277 CE",
    field: "Hadith" as FieldKey,
    contribution:
      "Compiled Riyad us-Saliheen and the famous Forty Hadith collection.",
    biography:
      "Yahya ibn Sharaf al-Nawawi was born in the village of Nawa, south of Damascus. Despite his short life of only 45 years, he produced an extraordinary body of work. His 'Riyad us-Saliheen' (Gardens of the Righteous) is one of the most widely read hadith compilations. His 'Forty Hadith' collection became a foundational text for Islamic education worldwide. He also wrote the definitive commentary on Sahih Muslim. He was known for his ascetic lifestyle and devotion to scholarship, reportedly studying twelve lessons daily.",
  },
  {
    id: 10,
    name: "Ibn Kathir",
    arabic: "\u0627\u0628\u0646 \u0643\u062B\u064A\u0631",
    era: "1301-1373 CE",
    field: "Tafsir" as FieldKey,
    contribution:
      "Author of Tafsir Ibn Kathir, one of the most widely used Quran commentaries.",
    biography:
      "Ismail ibn Umar ibn Kathir was born in Busra, Syria, and studied in Damascus. He was a student of Ibn Taymiyyah and became one of the most renowned scholars of Quranic exegesis. His 'Tafsir al-Quran al-Azeem' (commonly known as Tafsir Ibn Kathir) interprets the Quran using hadith and other Quranic verses. He also authored 'Al-Bidaya wan-Nihaya' (The Beginning and the End), a comprehensive history from creation to his own time. His works remain essential references in Islamic scholarship today.",
  },
  {
    id: 11,
    name: "Ibn Qayyim al-Jawziyya",
    arabic:
      "\u0627\u0628\u0646 \u0642\u064A\u0645 \u0627\u0644\u062C\u0648\u0632\u064A\u0629",
    era: "1292-1350 CE",
    field: "Spirituality" as FieldKey,
    contribution:
      "Prolific author on Islamic spirituality, jurisprudence, and theology.",
    biography:
      "Shams al-Din Muhammad ibn Abi Bakr ibn Qayyim al-Jawziyya was born in Damascus. He was the most prominent student of Ibn Taymiyyah and was imprisoned alongside him. He authored numerous influential works including 'Zad al-Ma'ad' (Provisions of the Hereafter), 'Madarij al-Salikin' (Ranks of the Seekers), and 'Al-Jawab al-Kafi' (The Sufficient Answer). His writings blend deep spiritual insight with scholarly rigor, covering topics from the diseases of the heart to prophetic medicine. He is considered one of the greatest Islamic scholars of all time.",
  },
  {
    id: 12,
    name: "Imam At-Tirmidhi",
    arabic:
      "\u0625\u0645\u0627\u0645 \u0627\u0644\u062A\u0631\u0645\u0630\u064A",
    era: "824-892 CE",
    field: "Hadith" as FieldKey,
    contribution:
      "Compiled Jami at-Tirmidhi, one of the six canonical hadith collections.",
    biography:
      "Abu Isa Muhammad ibn Isa at-Tirmidhi was born in Termez (modern-day Uzbekistan). He was a student of Imam al-Bukhari and compiled the Jami at-Tirmidhi, one of the six major hadith collections (Kutub al-Sittah). His collection is unique for including jurisprudential opinions of early scholars alongside the hadith. He introduced a grading system for hadith authenticity that became widely adopted. He lost his eyesight later in life but continued his scholarly work from memory.",
  },
  {
    id: 13,
    name: "Imam Abu Dawud",
    arabic:
      "\u0625\u0645\u0627\u0645 \u0623\u0628\u0648 \u062F\u0627\u0648\u062F",
    era: "817-889 CE",
    field: "Hadith" as FieldKey,
    contribution:
      "Compiled Sunan Abu Dawud, focused on hadith relevant to Islamic law.",
    biography:
      "Abu Dawud Sulayman ibn al-Ash'ath was born in Sistan (modern-day Iran/Afghanistan). He traveled extensively to collect hadith and compiled the Sunan Abu Dawud, selecting approximately 4,800 hadith from 500,000 narrations. His collection is particularly valued for its focus on hadith relevant to Islamic jurisprudence and daily practice. He presented his work to Imam Ahmad ibn Hanbal, who approved of it. He settled in Basra where he taught hadith until his death.",
  },
  {
    id: 14,
    name: "Imam Ibn Majah",
    arabic:
      "\u0625\u0645\u0627\u0645 \u0627\u0628\u0646 \u0645\u0627\u062C\u0647",
    era: "824-887 CE",
    field: "Hadith" as FieldKey,
    contribution:
      "Compiled Sunan Ibn Majah, the sixth of the canonical hadith collections.",
    biography:
      "Abu Abdullah Muhammad ibn Yazid ibn Majah was born in Qazvin, Iran. He compiled the Sunan Ibn Majah, which contains approximately 4,341 hadith. His collection completes the six canonical hadith books (Kutub al-Sittah) recognized by Sunni scholars. He traveled to Iraq, the Hijaz, Egypt, and Syria to gather hadith from prominent scholars of his time. His Sunan contains unique hadith not found in the other five collections, making it a valuable addition to hadith scholarship.",
  },
  {
    id: 15,
    name: "Al-Tabari",
    arabic: "\u0627\u0644\u0637\u0628\u0631\u064A",
    era: "839-923 CE",
    field: "Tafsir" as FieldKey,
    contribution:
      "Author of Tafsir at-Tabari and a comprehensive history of the world.",
    biography:
      "Abu Ja'far Muhammad ibn Jarir al-Tabari was born in Amol, Tabaristan (modern-day Iran). He is one of the most prolific scholars in Islamic history. His 'Jami al-Bayan an Ta'wil Ay al-Quran' (Tafsir at-Tabari) is the earliest comprehensive Quranic commentary and remains an essential reference. His 'Tarikh al-Rusul wal-Muluk' (History of Prophets and Kings) is one of the most detailed historical chronicles of the ancient and Islamic world. He was knowledgeable in multiple disciplines including hadith, fiqh, and history.",
  },
];

export default function ScholarsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getFieldColor = (field: FieldKey) => {
    const colorKey = FIELD_COLORS[field] as keyof typeof CategoryColors;
    return isDark ? CategoryColors[colorKey].dark : CategoryColors[colorKey];
  };

  const renderScholar = ({
    item,
    index,
  }: {
    item: (typeof SCHOLARS)[0];
    index: number;
  }) => {
    const isExpanded = expandedId === item.id;
    const fieldColor = getFieldColor(item.field);

    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(400)}>
        <Pressable
          onPress={() => toggleExpand(item.id)}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
          testID={`scholar-card-${item.id}`}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <View style={styles.nameRow}>
                <ThemedText type="h4" style={styles.scholarName}>
                  {item.name}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={[styles.arabicName, { color: theme.primary }]}
                >
                  {item.arabic}
                </ThemedText>
              </View>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.eraBadge,
                    {
                      backgroundColor: isDark
                        ? CategoryColors.amber.dark.bg
                        : CategoryColors.amber.bg,
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: isDark
                        ? CategoryColors.amber.dark.text
                        : CategoryColors.amber.text,
                    }}
                  >
                    {item.era}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.fieldBadge,
                    { backgroundColor: fieldColor.bg },
                  ]}
                >
                  <ThemedText type="caption" style={{ color: fieldColor.text }}>
                    {item.field}
                  </ThemedText>
                </View>
              </View>
            </View>
            <AppIcon
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.textSecondary}
            />
          </View>
          <ThemedText
            type="small"
            style={[styles.contribution, { color: theme.textSecondary }]}
          >
            {item.contribution}
          </ThemedText>
          {isExpanded ? (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={[
                styles.bioContainer,
                {
                  backgroundColor: isDark
                    ? theme.backgroundSecondary
                    : theme.surfaceElevated,
                },
              ]}
            >
              <ThemedText type="small" style={styles.bioText}>
                {item.biography}
              </ThemedText>
            </Animated.View>
          ) : null}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[
            styles.backButton,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <ThemedText type="h3" style={styles.headerTitle}>
            Islamic Scholars
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Lives of knowledge, worship, and service
          </ThemedText>
        </View>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={SCHOLARS}
        renderItem={renderScholar}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(360)}>
            <LinearGradient
              colors={["#062D20", "#0A3D2A", "#061A14"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <ScholarCrownSvg
                    size={36}
                    color={theme.primary}
                    accentColor={theme.scholar}
                  />
                </View>
                <View style={styles.heroCopy}>
                  <ThemedText
                    type="caption"
                    style={[styles.heroEyebrow, { color: theme.scholar }]}
                  >
                    KNOWLEDGE LINEAGE
                  </ThemedText>
                  <ThemedText type="h2" style={{ color: theme.onGradient }}>
                    Learn from the people of scholarship
                  </ThemedText>
                </View>
              </View>
              <GoldDivider
                color={theme.scholar}
                opacity={0.46}
                style={styles.heroDivider}
              />
              <ThemedText
                type="body"
                style={{ color: theme.onGradientMuted, lineHeight: 23 }}
              >
                Explore biographies, fields of study, and the lasting
                contributions of major scholars in Islamic history.
              </ThemedText>
            </LinearGradient>
          </Animated.View>
        }
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        testID="scholars-list"
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    textAlign: "center",
  },
  heroCard: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.24)",
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 185, 129, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.22)",
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  heroEyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 1.4,
  },
  heroDivider: {
    marginVertical: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  cardHeaderText: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
    marginBottom: Spacing.xs,
  },
  scholarName: {
    flexShrink: 1,
  },
  arabicName: {
    fontSize: 16,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
    marginTop: Spacing.xs,
  },
  eraBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  fieldBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  contribution: {
    lineHeight: 20,
  },
  bioContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  bioText: {
    lineHeight: 22,
  },
});
