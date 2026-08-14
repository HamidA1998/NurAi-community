import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, CategoryColors } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
  ScholarCrownSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

interface FiqhCategory {
  id: string;
  title: string;
  arabicTitle: string;
  icon: AppIconName;
  color: keyof typeof CategoryColors;
  description: string;
  rules: string[];
}

const fiqhCategories: FiqhCategory[] = [
  {
    id: "taharah",
    title: "Taharah (Purification)",
    arabicTitle: "الطهارة",
    icon: "droplet",
    color: "blue",
    description: "The foundation of worship - purification of body and soul.",
    rules: [
      "Types of Water: Pure (tahir) water is suitable for purification. Used water (musta'mal) and impure water (mutanajjis) have specific rulings.",
      "Wudu (Ablution): Washing the face, arms to elbows, wiping the head, and washing feet to ankles. Has specific obligatory and sunnah acts.",
      "Ghusl (Full Bath): Required after major impurity (janabah), menstruation, and postpartum bleeding. Involves washing the entire body.",
      "Tayammum (Dry Ablution): Permitted when water is unavailable or harmful. Uses clean earth or dust on face and hands.",
      "Nawaqid al-Wudu: Things that invalidate wudu include relieving oneself, passing wind, deep sleep, and loss of consciousness.",
      "Istinja: Cleaning after using the restroom with water or stones, following the sunnah method.",
    ],
  },
  {
    id: "salah",
    title: "Salah (Prayer)",
    arabicTitle: "الصلاة",
    icon: "clock",
    color: "emerald",
    description:
      "The pillar of the religion and the first act judged on the Day of Judgment.",
    rules: [
      "Five Obligatory Prayers: Fajr (2 rak'ah), Dhuhr (4), Asr (4), Maghrib (3), Isha (4). Each has its prescribed time.",
      "Sunnah Prayers: Rawatib prayers before/after obligatory ones. Tahajjud, Duha, and Istikhara are recommended.",
      "Conditions of Salah: Purity, covering awrah, facing qiblah, entering the prayer time, and intention (niyyah).",
      "Pillars (Arkan): Standing, reciting Al-Fatiha, bowing (ruku'), prostration (sujud), sitting for tashahhud, and salam.",
      "Obligatory Acts (Wajibat): Takbiratul ihram, saying 'SubhanAllah' in ruku' and sujud, and sitting between two prostrations.",
      "Congregational Prayer: Highly recommended for men. The imam leads and followers must follow his movements.",
      "Jumu'ah Prayer: Obligatory Friday prayer replacing Dhuhr. Requires a khutbah (sermon) and congregation.",
    ],
  },
  {
    id: "sawm",
    title: "Sawm (Fasting)",
    arabicTitle: "الصيام",
    icon: "moon",
    color: "amber",
    description:
      "Abstaining from food, drink, and desires from dawn to sunset.",
    rules: [
      "Ramadan Fasting: Obligatory for every sane, adult Muslim. Begins at Fajr and ends at Maghrib.",
      "Voluntary Fasting: Mondays and Thursdays, three days each month (13th, 14th, 15th), Day of Arafah, Day of Ashura.",
      "Invalidators: Eating or drinking intentionally, vomiting deliberately, menstruation, and marital relations during fasting hours.",
      "Exemptions: Travelers, the sick, pregnant and nursing women, the elderly, and children before puberty.",
      "Suhoor and Iftar: Pre-dawn meal (suhoor) is sunnah. Breaking fast at sunset (iftar) should be done promptly, preferably with dates.",
      "Kaffarah and Fidyah: Expiation for deliberately breaking fast. Fidyah (feeding the poor) for those permanently unable to fast.",
    ],
  },
  {
    id: "zakat",
    title: "Zakat",
    arabicTitle: "الزكاة",
    icon: "heart",
    color: "rose",
    description: "Purification of wealth through obligatory charity.",
    rules: [
      "Who Must Pay: Every free, sane Muslim whose wealth reaches the nisab and has been held for one lunar year.",
      "Nisab: The minimum threshold - equivalent to 85 grams of gold or 595 grams of silver.",
      "Rate: Generally 2.5% of qualifying wealth including savings, gold, silver, trade goods, and investments.",
      "Eight Recipients: The poor, the needy, zakat collectors, new Muslims, freeing captives, debtors, in the cause of Allah, and travelers.",
      "Zakat al-Fitr: Obligatory charity at the end of Ramadan, given before Eid prayer. One sa' (approximately 3kg) of staple food per person.",
      "Calculation: Total qualifying assets minus debts and basic needs, multiplied by 2.5% if above nisab for one year.",
    ],
  },
  {
    id: "hajj",
    title: "Hajj",
    arabicTitle: "الحج",
    icon: "map-pin",
    color: "purple",
    description:
      "The pilgrimage to Makkah, obligatory once in a lifetime for those able.",
    rules: [
      "Pillars of Hajj: Ihram (sacred state), standing at Arafah, Tawaf al-Ifadah, and Sa'i between Safa and Marwah.",
      "Requirements: Islam, sanity, adulthood, freedom, and physical and financial ability to perform the journey.",
      "Umrah: The lesser pilgrimage that can be performed at any time. Consists of Ihram, Tawaf, Sa'i, and shaving/cutting hair.",
      "Steps of Hajj: 8th Dhul Hijjah (Mina), 9th (Arafah), 10th (Muzdalifah, stoning, sacrifice, Tawaf), 11-13th (Mina, stoning).",
      "Ihram Restrictions: No cutting hair or nails, no perfume, no hunting, no marital relations, men cannot cover head or wear fitted clothing.",
      "Sacrifice: On Eid al-Adha, pilgrims sacrifice an animal. Non-pilgrims also observe this sunnah globally.",
    ],
  },
  {
    id: "nikah",
    title: "Nikah (Marriage)",
    arabicTitle: "النكاح",
    icon: "users",
    color: "teal",
    description:
      "The sacred contract uniting two people in a partnership of faith and love.",
    rules: [
      "Conditions: Mutual consent, wali (guardian) for the bride, two witnesses, and mahr (dowry) for the bride.",
      "Rights of the Wife: Financial maintenance (nafaqah), kind treatment, fair division of time (in polygyny), and mahr.",
      "Rights of the Husband: Obedience in what is right, maintaining the home, and mutual respect and cooperation.",
      "Mahr (Dowry): A gift from the groom to the bride. It is her right and can be of any agreed-upon value.",
      "Responsibilities: Both spouses must maintain the household, raise children upon Islamic values, and support each other.",
      "Divorce (Talaq): Permitted but disliked. Has specific procedures, waiting periods (iddah), and conditions for reconciliation.",
    ],
  },
  {
    id: "muamalat",
    title: "Mu'amalat (Transactions)",
    arabicTitle: "المعاملات",
    icon: "briefcase",
    color: "indigo",
    description:
      "Islamic guidelines for business, finance, and economic dealings.",
    rules: [
      "Halal Business: Transactions must be free from deception (gharar), gambling (maysir), and forbidden goods.",
      "Interest Prohibition (Riba): All forms of interest are strictly prohibited. Islamic finance offers alternatives like murabahah and musharakah.",
      "Contracts: Must be clear, mutually agreed upon, and free from coercion. Both parties must understand the terms.",
      "Debt: Borrowing is permitted for need. Debts must be documented and repaid promptly. Lending without interest is encouraged.",
      "Partnership (Shirkah): Profit and loss sharing partnerships are encouraged as ethical business models.",
      "Honesty in Trade: Full disclosure of defects, accurate weights and measures, and no price manipulation or hoarding.",
    ],
  },
  {
    id: "food",
    title: "Food & Drink",
    arabicTitle: "الأطعمة والأشربة",
    icon: "coffee",
    color: "orange",
    description:
      "Dietary guidelines for permissible and prohibited consumption.",
    rules: [
      "Halal Animals: Cattle, sheep, goats, camels, chickens, and most fish are halal when properly slaughtered.",
      "Haram Animals: Pigs, predatory animals with fangs, birds of prey, and donkeys are prohibited.",
      "Slaughter Rules (Dhabihah): The animal must be alive, Allah's name must be mentioned, and the throat, windpipe, and blood vessels must be cut swiftly.",
      "Alcohol: All intoxicants are strictly prohibited, including alcohol in food, beverages, and cooking.",
      "Etiquette: Say Bismillah before eating, eat with the right hand, eat from what is nearest, and thank Allah after finishing.",
      "Doubtful Matters: When in doubt about food ingredients or preparation, it is best to avoid them following the principle of caution.",
    ],
  },
];

function CategoryCard({
  category,
  index,
}: {
  category: FiqhCategory;
  index: number;
}) {
  const { theme, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const colorSet = isDark
    ? CategoryColors[category.color].dark
    : CategoryColors[category.color];

  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 80).duration(500)}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        testID={`button-fiqh-${category.id}`}
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
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View style={styles.categoryHeader}>
            <View
              style={[styles.categoryIcon, { backgroundColor: colorSet.bg }]}
            >
              <AppIcon name={category.icon} size={20} color={colorSet.text} />
            </View>
            <View style={styles.categoryInfo}>
              <ThemedText type="h4">{category.title}</ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginTop: 2 }}
              >
                {category.arabicTitle}
              </ThemedText>
            </View>
            <AppIcon
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.textMuted}
            />
          </View>

          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
          >
            {category.description}
          </ThemedText>

          {expanded ? (
            <View
              style={[
                styles.rulesContainer,
                { borderTopColor: theme.borderSubtle },
              ]}
            >
              {category.rules.map((rule, ruleIndex) => (
                <View key={ruleIndex} style={styles.ruleItem}>
                  <View
                    style={[styles.bullet, { backgroundColor: colorSet.text }]}
                  />
                  <ThemedText type="small" style={styles.ruleText}>
                    {rule}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function FiqhScreen() {
  const { theme } = useTheme();
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
          Fiqh Guide
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
            colors={[theme.gradientStart, "#0D9488"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <GeometricCardPattern color="#FFFFFF" opacity={0.012} />
            <ScholarCrownSvg
              size={42}
              color="#FFF"
              accentColor={theme.scholar}
            />
            <ThemedText
              type="h3"
              style={{
                color: "#FFF",
                marginTop: Spacing.md,
                textAlign: "center",
              }}
            >
              Islamic Jurisprudence
            </ThemedText>
            <GoldDivider
              color={theme.scholar}
              opacity={0.62}
              style={styles.heroDivider}
            />
            <ThemedText
              type="small"
              style={{
                color: "rgba(255,255,255,0.9)",
                marginTop: Spacing.sm,
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              Fiqh is the understanding of Islamic law derived from the Quran
              and Sunnah. It covers all aspects of a Muslim's life, from worship
              to daily transactions.
            </ThemedText>
          </LinearGradient>
        </Animated.View>

        {fiqhCategories.map((category, index) => (
          <CategoryCard key={category.id} category={category} index={index} />
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
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryInfo: {
    flex: 1,
  },
  rulesContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  ruleItem: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  ruleText: {
    flex: 1,
    lineHeight: 22,
  },
});
