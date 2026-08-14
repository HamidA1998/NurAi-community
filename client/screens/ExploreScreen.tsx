import React, { useCallback } from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, CategoryColors, BorderRadius } from "@/constants/theme";
import { useNurAI } from "@/context/NurAIContext";
import { CrescentMark } from "@/components/premium/svg/PremiumSvgs";
import { PremiumBadge } from "@/components/PremiumGate";
import { PremiumHeader, PremiumScreen } from "@/components/premium";
import { NuraiGlass } from "@/design-system";
import { AppIcon, type AppIconName } from "@/components/icons";
import {
  QuickAccessIcon,
  type QuickAccessIconId,
} from "@/components/home/QuickAccessIcon";

type CategoryColorKey = keyof typeof CategoryColors;

const EXPLORE_GLASS_TINT = "rgba(7, 20, 22, 0.46)";

interface CategoryCard {
  icon: AppIconName;
  title: string;
  subtitle: string;
  colorKey: CategoryColorKey;
  screen: string;
  navParams?: object;
  isPremium?: boolean;
}

const CATEGORY_CARDS: CategoryCard[] = [
  {
    icon: "prayer",
    title: "Prayer Times",
    subtitle: "Accurate daily salah times",
    colorKey: "emerald",
    screen: "PrayerTimes",
  },
  {
    icon: "qibla",
    title: "Qibla",
    subtitle: "Live compass and Kaaba bearing",
    colorKey: "amber",
    screen: "Qibla",
  },
  {
    icon: "tasbeeh",
    title: "Tasbeeh",
    subtitle: "Dhikr counter with goals",
    colorKey: "emerald",
    screen: "Tasbeeh",
  },
  {
    icon: "dua",
    title: "Duas",
    subtitle: "Daily prayers and supplications",
    colorKey: "emerald",
    screen: "Duas",
  },
  {
    icon: "book",
    title: "Prophet Stories",
    subtitle: "Prophet stories & tales",
    colorKey: "emerald",
    screen: "Prophets",
  },
  {
    icon: "quran",
    title: "Quran",
    subtitle: "Read & memorize surahs",
    colorKey: "amber",
    screen: "Main",
    navParams: { screen: "Quran" },
  },
  {
    icon: "prayer",
    title: "Salah & Wudu",
    subtitle: "Learn to pray properly",
    colorKey: "emerald",
    screen: "SalahGuide",
  },
  {
    icon: "names-of-allah",
    title: "99 Names",
    subtitle: "Reflect on Allah's names",
    colorKey: "amber",
    screen: "NamesOfAllah",
  },
  {
    icon: "sunrise",
    title: "Adhkar",
    subtitle: "Morning & evening dhikr",
    colorKey: "emerald",
    screen: "Adhkar",
  },
  {
    icon: "moon-calendar",
    title: "Islamic Calendar",
    subtitle: "Hijri dates, events, and meaningful days",
    colorKey: "emerald",
    screen: "IslamicCalendar",
  },
  {
    icon: "hifz",
    title: "Hifz Tracker",
    subtitle: "Memorize the Quran",
    colorKey: "amber",
    screen: "Hifz",
  },
  {
    icon: "calendar",
    title: "Reading Plan",
    subtitle: "Complete Quran in 30-365 days",
    colorKey: "amber",
    screen: "QuranReadingPlan",
  },
  {
    icon: "kaaba",
    title: "Hajj & Umrah",
    subtitle: "Pilgrimage guide",
    colorKey: "amber",
    screen: "HajjUmrah",
  },
  {
    icon: "target",
    title: "Arabic Practice",
    subtitle: "Fast practice for letters, words, and recall",
    colorKey: "emerald",
    screen: "ArabicGames",
  },
  {
    icon: "family",
    title: "Family Circle",
    subtitle: "Grow together at home",
    colorKey: "emerald",
    screen: "FamilyGroup",
  },
  {
    icon: "women-space",
    title: "Women's Health",
    subtitle: "Private cycle care and qada guidance",
    colorKey: "emerald",
    screen: "WomensHealth",
  },
  {
    icon: "streak-garden",
    title: "Streak Garden",
    subtitle: "Keep your daily deen alive",
    colorKey: "emerald",
    screen: "StreakGarden",
  },
];

interface ToolItem {
  icon: AppIconName;
  title: string;
  subtitle: string;
  screen: string;
  colorKey: CategoryColorKey;
  navParams?: object;
  isPremium?: boolean;
}

const TOOLS: ToolItem[] = [
  {
    icon: "bookmark",
    title: "Bookmarks",
    subtitle: "Saved ayahs, duas & hadiths",
    screen: "Bookmarks",
    colorKey: "emerald",
  },
  {
    icon: "mosque",
    title: "Nearby Mosques",
    subtitle: "Find mosques & halal food",
    screen: "NearbyMosques",
    colorKey: "emerald",
  },
  {
    icon: "share-2",
    title: "Verse Cards",
    subtitle: "Beautiful verse cards",
    screen: "ShareableCards",
    colorKey: "amber",
  },
  {
    icon: "islamic-finance",
    title: "Islamic Finance",
    subtitle: "Sadaqah & investing",
    screen: "IslamicFinance",
    colorKey: "emerald",
  },
  {
    icon: "book-open",
    title: "NurAI Library",
    subtitle: "Interactive Islamic books",
    screen: "LibraryHome",
    colorKey: "emerald",
  },
  {
    icon: "hard-drive",
    title: "Offline Library",
    subtitle: "Manage Quran, nasheeds, and book audio",
    screen: "OfflineLibrary",
    colorKey: "emerald",
    isPremium: true,
  },
  {
    icon: "play-circle",
    title: "Scholar Talks",
    subtitle: "Official lectures & reminders",
    screen: "ScholarMedia",
    colorKey: "amber",
  },
  {
    icon: "file-text",
    title: "Quran Tafsir",
    subtitle: "Source-guided verse explanations",
    screen: "Tafsir",
    colorKey: "amber",
  },
  {
    icon: "arabic-learning",
    title: "Arabic Learning",
    subtitle: "Dialogue, Quran words, and daily coaching",
    screen: "ArabicLearning",
    colorKey: "emerald",
  },
  {
    icon: "achievement",
    title: "Achievements",
    subtitle: "Track your progress",
    screen: "Achievements",
    colorKey: "emerald",
  },
  {
    icon: "hadith",
    title: "Hadith Library",
    subtitle: "Browse authentic hadith collections",
    screen: "Hadith",
    colorKey: "amber",
  },
  {
    icon: "file-text",
    title: "Fiqh Guide",
    subtitle: "Everyday learning with careful source boundaries",
    screen: "Fiqh",
    colorKey: "emerald",
  },
  {
    icon: "clock",
    title: "Islamic Timeline",
    subtitle: "A guided journey through Islamic history",
    screen: "Timeline",
    colorKey: "emerald",
  },
  {
    icon: "user-plus",
    title: "New Muslim Guide",
    subtitle: "Calm foundations and practical next steps",
    screen: "NewMuslim",
    colorKey: "emerald",
  },
  {
    icon: "compass",
    title: "Revert Journey",
    subtitle: "Build practice with steady, private support",
    screen: "RevertJourney",
    colorKey: "emerald",
  },
  {
    icon: "clipboard",
    title: "Janazah Guide",
    subtitle: "Careful reminders and preparation",
    screen: "Janazah",
    colorKey: "emerald",
  },
  {
    icon: "headphones",
    title: "Nasheeds",
    subtitle: "Focused listening and gentle media",
    screen: "Nasheeds",
    colorKey: "emerald",
  },
  {
    icon: "scholar",
    title: "Scholars",
    subtitle: "Profiles, learning routes, and trusted study",
    screen: "Scholars",
    colorKey: "amber",
  },
  {
    icon: "sun",
    title: "Daily Inspiration",
    subtitle: "Short reminders for your day",
    screen: "Inspiration",
    colorKey: "emerald",
  },
  {
    icon: "flag",
    title: "Challenges",
    subtitle: "Small guided goals for steady momentum",
    screen: "Challenges",
    colorKey: "emerald",
  },
  {
    icon: "bar-chart-2",
    title: "Hasanat Tracker",
    subtitle: "Prayer, charity, and daily good deed progress",
    screen: "Hasanat",
    colorKey: "emerald",
  },
  {
    icon: "health",
    title: "Health Companion",
    subtitle: "Muslim self-care with clear medical safety boundaries",
    screen: "MuslimHealth",
    colorKey: "emerald",
  },
  {
    icon: "moon-calendar",
    title: "Ramadan",
    subtitle: "Fasting, Quran, worship goals, and daily planning",
    screen: "Ramadan",
    colorKey: "amber",
  },
  {
    icon: "star",
    title: "Kids Mode",
    subtitle: "Safe learning spaces for younger Muslims",
    screen: "KidsMode",
    colorKey: "emerald",
  },
];

type ExploreFeature = CategoryCard | ToolItem;

interface ExplorePriorityAction {
  icon: AppIconName;
  testID: string;
  title: string;
  subtitle: string;
  meta: string;
  screen: string;
  navParams?: object;
  tone: "primary" | "scholar";
}

interface ExploreGroup {
  title: string;
  subtitle: string;
  icon: AppIconName;
  highlight?: "primary" | "scholar";
  items: string[];
}

const EXPLORE_GROUPS: ExploreGroup[] = [
  {
    title: "Start Today",
    subtitle:
      "The fastest routes for prayer, Quran, dhikr, and your next step.",
    icon: "sunrise",
    highlight: "primary",
    items: ["Prayer Times", "Qibla", "Quran", "Tasbeeh"],
  },
  {
    title: "Quran & Learning",
    subtitle: "Read, understand, memorise, and build Quranic Arabic.",
    icon: "book-open",
    items: [
      "Reading Plan",
      "Hifz Tracker",
      "Quran Tafsir",
      "Arabic Learning",
      "Hadith Library",
      "99 Names",
      "Scholars",
    ],
  },
  {
    title: "Health & Wellbeing",
    subtitle: "Body, energy, and cycle as an amanah — tracked with ihsan.",
    icon: "activity",
    items: ["Health Companion", "Women's Health"],
  },
  {
    title: "Daily Worship",
    subtitle: "Small actions that make the day feel spiritually anchored.",
    icon: "heart",
    items: [
      "Duas",
      "Adhkar",
      "Islamic Calendar",
      "Salah & Wudu",
      "Prophet Stories",
      "Arabic Practice",
      "Daily Inspiration",
    ],
  },
  {
    title: "Guides & Foundations",
    subtitle: "Practical learning for new steps, life events, and history.",
    icon: "map",
    items: [
      "Fiqh Guide",
      "Islamic Timeline",
      "New Muslim Guide",
      "Revert Journey",
      "Janazah Guide",
    ],
  },
  {
    title: "Life & Family",
    subtitle: "Travel, home, halal places, pilgrimage, and family growth.",
    icon: "users",
    items: [
      "Family Circle",
      "Travel Mode",
      "Nearby Mosques",
      "Hajj & Umrah",
      "Islamic Finance",
      "Ramadan",
      "Kids Mode",
    ],
  },
  {
    title: "Progress & Library",
    subtitle:
      "Your saved knowledge, books, milestones, and shareable reminders.",
    icon: "trending-up",
    items: [
      "Streak Garden",
      "Achievements",
      "Bookmarks",
      "NurAI Library",
      "Offline Library",
      "Verse Cards",
      "Scholar Talks",
      "Nasheeds",
      "Challenges",
      "Hasanat Tracker",
    ],
  },
];

/**
 * Explore and Home now share one authored destination-mark vocabulary. The
 * title map keeps the navigation contract untouched while preventing a
 * generic book, chart, or media glyph from representing a whole feature.
 */
const EXPLORE_FEATURE_ICON_IDS: Record<string, QuickAccessIconId> = {
  "Prayer Times": "prayer",
  Qibla: "qibla",
  Tasbeeh: "tasbeeh",
  Duas: "duas",
  "Prophet Stories": "prophets",
  Quran: "quran",
  "Salah & Wudu": "salah_wudu",
  "99 Names": "99names",
  Adhkar: "adhkar",
  "Islamic Calendar": "calendar",
  "Hifz Tracker": "hifz",
  "Reading Plan": "reading_plan",
  "Hajj & Umrah": "hajj",
  "Arabic Practice": "arabic_games",
  "Family Circle": "family",
  "Women's Health": "womens_health",
  "Streak Garden": "streak",
  Bookmarks: "bookmarks",
  "Nearby Mosques": "mosques",
  "Verse Cards": "share_cards",
  "Islamic Finance": "finance",
  "NurAI Library": "library",
  "Offline Library": "offline_library",
  "Scholar Talks": "scholar_talks",
  "Quran Tafsir": "tafsir",
  "Arabic Learning": "arabic_learning",
  Achievements: "achievements",
  "Hadith Library": "hadith",
  "Fiqh Guide": "fiqh",
  "Islamic Timeline": "timeline",
  "New Muslim Guide": "new_muslim",
  "Revert Journey": "revert_journey",
  "Janazah Guide": "janazah",
  Nasheeds: "nasheeds",
  Scholars: "scholars",
  "Daily Inspiration": "inspiration",
  Challenges: "challenges",
  "Hasanat Tracker": "hasanat",
  "Health Companion": "muslim_health",
  Ramadan: "ramadan",
  "Kids Mode": "kids",
};

const EXPLORE_GROUP_ICON_IDS: Record<string, QuickAccessIconId> = {
  "Start Today": "prayer",
  "Quran & Learning": "quran",
  "Health & Wellbeing": "muslim_health",
  "Daily Worship": "duas",
  "Guides & Foundations": "fiqh",
  "Life & Family": "family",
  "Progress & Library": "timeline",
};

function getExploreFeatureIconId(feature: ExploreFeature): QuickAccessIconId {
  return EXPLORE_FEATURE_ICON_IDS[feature.title] || "inspiration";
}

function getExplorePriorityIconId(
  action: ExplorePriorityAction,
): QuickAccessIconId {
  if (action.meta === "Prayer") return "prayer";
  if (action.meta === "Quran") return "quran";
  return "muslim_health";
}

const ALL_EXPLORE_FEATURES: ExploreFeature[] = [...CATEGORY_CARDS, ...TOOLS];

const TODAY_PRIORITY_ACTIONS: ExplorePriorityAction[] = [
  {
    icon: "clock",
    testID: "explore-priority-prayer",
    title: "Protect the next prayer",
    subtitle: "Open times, athan controls, and smart reminders.",
    meta: "Prayer",
    screen: "PrayerTimes",
    tone: "scholar",
  },
  {
    icon: "book-open",
    testID: "explore-priority-quran",
    title: "Understand one ayah",
    subtitle: "Use the ayah lens for meaning, words, action, and sources.",
    meta: "Quran",
    screen: "QuranReader",
    navParams: {
      surahNumber: 1,
      initialVerse: 1,
      initialStudyMode: "meaning",
    },
    tone: "primary",
  },
  {
    icon: "activity",
    testID: "explore-priority-health",
    title: "Check on your body",
    subtitle: "Steps, sleep, recovery, and cycle care in one clear view.",
    meta: "Health",
    screen: "MuslimHealth",
    tone: "primary",
  },
];

function findExploreFeature(title: string): ExploreFeature | undefined {
  return ALL_EXPLORE_FEATURES.find((feature) => feature.title === title);
}

export default function ExploreScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { v3State } = useNurAI();

  const getCategoryColor = useCallback(
    (key: CategoryColorKey) => {
      const usesSacredGold = key === "amber";
      return {
        bg: usesSacredGold ? theme.scholarSoft : theme.primaryMuted,
        text: usesSacredGold ? theme.scholar : theme.primary,
      };
    },
    [theme.primary, theme.primaryMuted, theme.scholar, theme.scholarSoft],
  );

  const handleFeaturePress = (feature: ExploreFeature) => {
    void Haptics.selectionAsync().catch(() => undefined);
    if (feature.navParams) {
      navigation.navigate(feature.screen, feature.navParams);
    } else {
      navigation.navigate(feature.screen);
    }
  };

  const handlePriorityActionPress = (action: ExplorePriorityAction) => {
    void Haptics.selectionAsync().catch(() => undefined);
    if (action.navParams) {
      navigation.navigate(action.screen, action.navParams);
    } else {
      navigation.navigate(action.screen);
    }
  };

  const renderFeatureTile = (
    feature: ExploreFeature,
    index: number,
    compact = false,
  ) => {
    const color = getCategoryColor(feature.colorKey);
    const featureIconId = getExploreFeatureIconId(feature);
    return (
      <Animated.View
        key={feature.title}
        entering={FadeInDown.delay(index * 34).duration(280)}
        style={compact ? styles.compactFeatureWrap : styles.groupFeatureWrap}
      >
        <Pressable
          onPress={() => handleFeaturePress(feature)}
          style={({ pressed }) => [
            styles.groupFeatureTile,
            compact ? styles.compactFeatureTile : null,
            {
              backgroundColor: compact
                ? "transparent"
                : "rgba(255,255,255,0.025)",
              borderColor: theme.borderSubtle,
              borderWidth: compact ? 0 : 1,
              borderBottomWidth: compact ? StyleSheet.hairlineWidth : 1,
            },
            pressed ? { opacity: 0.86, transform: [{ scale: 0.985 }] } : null,
          ]}
          testID={`explore-${feature.title.toLowerCase().replace(/\s/g, "-")}`}
          accessibilityRole="button"
          accessibilityLabel={`${feature.title}. ${feature.subtitle}`}
        >
          {!compact ? (
            <LinearGradient
              colors={[`${color.text}18`, "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGlow}
            />
          ) : null}
          <View
            style={[styles.groupFeatureIcon, { backgroundColor: color.bg }]}
          >
            <QuickAccessIcon
              id={featureIconId}
              icon={feature.icon}
              size={compact ? 25 : 27}
            />
          </View>
          <View style={styles.groupFeatureText}>
            <View style={styles.toolTitleRow}>
              <Text
                style={[styles.groupFeatureTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {feature.title}
              </Text>
              {feature.screen === "Tafsir" ? (
                <PremiumBadge tier="scholar" />
              ) : feature.isPremium ? (
                <PremiumBadge tier="premium" />
              ) : null}
            </View>
            <Text
              style={[
                styles.groupFeatureSubtitle,
                { color: theme.textSecondary },
              ]}
              numberOfLines={compact ? 1 : 2}
            >
              {feature.subtitle}
            </Text>
          </View>
          {!compact ? (
            <AppIcon name="chevron-right" size={17} color={theme.textMuted} />
          ) : (
            <AppIcon name="chevron-right" size={15} color={theme.textMuted} />
          )}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <>
      <PremiumScreen
        scroll
        padded={false}
        contentContainerStyle={styles.scrollContent}
        pattern={false}
        aurora
      >
        <View style={styles.header}>
          <PremiumHeader
            title="Explore"
            eyebrow="DISCOVER WITH INTENT"
            subtitle="Prayer, Quran, learning, and wellbeing without catalogue noise."
            icon={<CrescentMark size={30} color={theme.primary} />}
          />
        </View>

        <Animated.View entering={FadeInDown.delay(40).duration(360)}>
          <View
            style={[
              styles.cleanCommandPanel,
              {
                backgroundColor: "transparent",
                borderColor: theme.borderSubtle,
              },
            ]}
            testID="explore-clean-command-panel"
          >
            <NuraiGlass
              pointerEvents="none"
              radius={20}
              tint={EXPLORE_GLASS_TINT}
              style={StyleSheet.absoluteFillObject}
            />
            <Pressable
              testID="explore-search"
              accessibilityRole="button"
              accessibilityLabel="Search the NurAI app"
              onPress={() => navigation.navigate("GlobalSearch")}
              style={({ pressed }) => [
                styles.cleanSearchRow,
                {
                  backgroundColor: `${theme.primary}0C`,
                  borderColor: `${theme.primary}26`,
                },
                pressed
                  ? { opacity: 0.84, transform: [{ scale: 0.99 }] }
                  : null,
              ]}
            >
              <View
                style={[
                  styles.cleanSearchIcon,
                  { backgroundColor: `${theme.primary}18` },
                ]}
              >
                <AppIcon name="search" size={18} color={theme.primary} />
              </View>
              <View style={styles.cleanSearchCopy}>
                <ThemedText
                  type="small"
                  numberOfLines={1}
                  style={{ color: theme.text, fontWeight: "900" }}
                >
                  Search NurAI
                </ThemedText>
                <ThemedText
                  type="caption"
                  numberOfLines={1}
                  style={{ color: theme.textMuted }}
                >
                  Ayahs, worship, learning, and more.
                </ThemedText>
              </View>
              <AppIcon name="arrow-right" size={17} color={theme.primary} />
            </Pressable>

            <View style={styles.cleanActionGrid}>
              {TODAY_PRIORITY_ACTIONS.map((action) => {
                const accent =
                  action.tone === "scholar" ? theme.scholar : theme.primary;
                return (
                  <Pressable
                    key={action.title}
                    onPress={() => handlePriorityActionPress(action)}
                    accessibilityRole="button"
                    accessibilityLabel={action.title}
                    testID={action.testID}
                    style={({ pressed }) => [
                      styles.cleanActionPill,
                      {
                        backgroundColor: `${accent}0F`,
                        borderColor: `${accent}2A`,
                      },
                      pressed
                        ? { opacity: 0.82, transform: [{ scale: 0.98 }] }
                        : null,
                    ]}
                  >
                    <QuickAccessIcon
                      id={getExplorePriorityIconId(action)}
                      icon={action.icon}
                      size={17}
                    />
                    <ThemedText
                      type="caption"
                      numberOfLines={1}
                      style={{ color: theme.text, fontWeight: "900" }}
                    >
                      {action.meta === "Prayer" ? "Worship" : action.meta}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>

        <View style={styles.groupStack}>
          {EXPLORE_GROUPS.map((group, groupIndex) => {
            const features = group.items
              .map(findExploreFeature)
              .filter(Boolean) as ExploreFeature[];
            const groupAccent =
              group.highlight === "scholar" ? theme.scholar : theme.primary;

            if (!features.length) return null;

            return (
              <Animated.View
                key={group.title}
                entering={FadeInDown.delay(180 + groupIndex * 60).duration(360)}
                style={[
                  styles.featureGroup,
                  {
                    backgroundColor: "transparent",
                    borderColor:
                      group.highlight === "scholar"
                        ? `${theme.scholar}35`
                        : theme.borderSubtle,
                    borderBottomWidth:
                      groupIndex < EXPLORE_GROUPS.length - 1
                        ? StyleSheet.hairlineWidth
                        : 0,
                  },
                ]}
              >
                <View style={styles.groupHeaderRow}>
                  <View
                    style={[
                      styles.groupHeaderIcon,
                      {
                        backgroundColor:
                          group.highlight === "scholar"
                            ? theme.scholarSoft
                            : theme.primarySubtle,
                        borderColor:
                          group.highlight === "scholar"
                            ? `${theme.scholar}38`
                            : theme.primaryBorder,
                      },
                    ]}
                  >
                    <QuickAccessIcon
                      id={EXPLORE_GROUP_ICON_IDS[group.title] || "inspiration"}
                      icon={group.icon}
                      size={22}
                    />
                  </View>
                  <View style={styles.groupHeaderText}>
                    <ThemedText
                      type="h4"
                      style={{ color: theme.text }}
                      numberOfLines={1}
                    >
                      {group.title}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted, marginTop: 2 }}
                      numberOfLines={2}
                    >
                      {group.subtitle}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.groupCountBadge,
                      { backgroundColor: `${groupAccent}12` },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{ color: groupAccent, fontWeight: "800" }}
                    >
                      {features.length}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.compactFeatureGrid}>
                  {features.map((feature, index) =>
                    renderFeatureTile(feature, index + groupIndex * 4, true),
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>

        {v3State && v3State.upcomingEvents.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(380).duration(400)}>
            <ThemedText
              type="caption"
              style={[styles.sectionLabel, { color: theme.textMuted }]}
            >
              UPCOMING EVENTS
            </ThemedText>
            <View
              style={[
                styles.eventsCard,
                {
                  backgroundColor: "transparent",
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <NuraiGlass
                pointerEvents="none"
                radius={18}
                tint={EXPLORE_GLASS_TINT}
                style={StyleSheet.absoluteFillObject}
              />
              {v3State.upcomingEvents.slice(0, 3).map((event, i) => (
                <View
                  key={i}
                  style={[
                    styles.eventRow,
                    i < Math.min(v3State.upcomingEvents.length, 3) - 1
                      ? {
                          borderBottomWidth: 1,
                          borderBottomColor: theme.borderSubtle,
                        }
                      : null,
                  ]}
                >
                  <View
                    style={[
                      styles.eventDot,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                  <View style={styles.eventTextWrap}>
                    <Text style={[styles.eventName, { color: theme.text }]}>
                      {event.name}
                    </Text>
                    <Text
                      style={[styles.eventDays, { color: theme.textMuted }]}
                    >
                      {event.daysUntil === 0
                        ? "Today"
                        : event.daysUntil === 1
                          ? "Tomorrow"
                          : `In ${event.daysUntil} days`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : null}
      </PremiumScreen>
    </>
  );
}

const GRID_GAP = Spacing.md;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
  },
  headerTextWrap: {
    flex: 1,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 132,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  cleanCommandPanel: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 0,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  cleanCommandTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  cleanCommandCopy: {
    flex: 1,
    minWidth: 0,
  },
  cleanEyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  cleanTitle: {
    lineHeight: 30,
  },
  cleanStatusPill: {
    minHeight: 28,
    maxWidth: 116,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  cleanSearchRow: {
    minHeight: 62,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cleanSearchIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cleanSearchCopy: {
    flex: 1,
    minWidth: 0,
  },
  cleanActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  cleanActionPill: {
    width: "48.5%",
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },
  heroCard: {
    borderRadius: 30,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  heroEyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    lineHeight: 34,
    marginBottom: Spacing.sm,
  },
  heroBody: {
    lineHeight: 21,
    maxWidth: 330,
  },
  heroCommandCenter: {
    marginTop: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  heroSearchSurface: {
    minHeight: 64,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  heroSearchIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSearchText: {
    flex: 1,
    minWidth: 0,
  },
  heroCommandBadge: {
    minHeight: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  heroGuideSurface: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  heroGuideText: {
    flex: 1,
    minWidth: 0,
  },
  heroTrustRail: {
    marginTop: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  heroTrustPill: {
    minHeight: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  heroPill: {
    minHeight: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  heroActionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  heroActionPrimary: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  heroActionSecondary: {
    minHeight: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  heroMetricRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  heroMetric: {
    flex: 1,
    minHeight: 62,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  homeOrbitPanel: {
    marginTop: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  homeOrbitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  homeOrbitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  homeOrbitAction: {
    width: "48.4%",
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  homeOrbitIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  systemSignalGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  systemSignalCard: {
    minHeight: 88,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  systemSignalIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  systemSignalText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  nextRouteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  nextRouteCard: {
    width: "48.5%",
    minHeight: 118,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  nextRouteTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  nextRouteIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nextRouteText: {
    gap: 4,
  },
  simpleRouteStack: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  simpleRouteRow: {
    minHeight: 66,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  simpleRouteIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  simpleRouteCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  simpleRouteMeta: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 11,
  },
  priorityStack: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  priorityCard: {
    minHeight: 92,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  priorityIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  priorityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  priorityMetaPill: {
    minHeight: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  connectedJourneyStack: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  connectedJourneyCard: {
    minHeight: 104,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    overflow: "hidden",
  },
  connectedJourneyIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  connectedJourneyText: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  connectedJourneyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  connectedJourneySteps: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  connectedJourneyStep: {
    minHeight: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  smartCollectionStack: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  smartCollectionCard: {
    minHeight: 184,
    borderRadius: 26,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    overflow: "hidden",
  },
  smartCollectionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  smartCollectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  smartCollectionText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  smartCollectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  smartCollectionOutcome: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  smartCollectionFooter: {
    gap: Spacing.sm,
  },
  smartCollectionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  smartCollectionChip: {
    minHeight: 26,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  smartCollectionAction: {
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  pathwayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  pathwayCard: {
    width: "48.5%",
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: "hidden",
    gap: Spacing.sm,
  },
  pathwayIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pathwayTitle: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 13,
  },
  pathwaySubtitle: {
    marginTop: 2,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
  },
  pathwayNumber: {
    position: "absolute",
    right: Spacing.md,
    top: Spacing.md,
    fontFamily: "LibreBaskerville_700Bold",
    fontSize: 20,
    opacity: 0.5,
  },
  smartRailContent: {
    paddingBottom: Spacing.lg,
  },
  smartActionCard: {
    width: 190,
    minHeight: 128,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: "hidden",
    gap: Spacing.sm,
  },
  smartActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  nurAiStudyCard: {
    minHeight: 92,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  nurAiStudyGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  nurAiStudyText: {
    flex: 1,
    gap: 3,
  },
  nurAiStudyEyebrow: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 1.4,
  },
  nurAiStudyDivider: {
    width: 150,
    marginVertical: -4,
  },
  nurAiStudyAction: {
    minHeight: 34,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  groupStack: {
    gap: 0,
    marginBottom: Spacing["2xl"],
  },
  featureGroup: {
    borderRadius: 0,
    borderWidth: 0,
    padding: 0,
    paddingVertical: Spacing.lg,
    overflow: "visible",
    gap: Spacing.md,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  groupHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  groupHeaderText: {
    flex: 1,
  },
  groupCountBadge: {
    minWidth: 26,
    height: 22,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  groupFeatureWrap: {
    width: "100%",
  },
  groupFeatureTile: {
    minHeight: 66,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    overflow: "hidden",
  },
  groupFeatureIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  groupFeatureText: {
    flex: 1,
    minWidth: 0,
  },
  groupFeatureTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  groupFeatureSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  compactFeatureGrid: {
    gap: 0,
  },
  compactFeatureWrap: {
    width: "100%",
  },
  compactFeatureTile: {
    minHeight: 74,
    borderRadius: 0,
    paddingHorizontal: 0,
    gap: Spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    marginBottom: Spacing["3xl"],
  },
  gridItem: {
    width: `${(100 - 3.5) / 2}%` as any,
  },
  categoryCard: {
    height: 152,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    justifyContent: "space-between",
    overflow: "hidden",
    borderWidth: 1,
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryPatternOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryGeometryPattern: {
    right: -48,
    top: -54,
  },
  patternCircle: {
    position: "absolute",
    borderRadius: 999,
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryArrow: {
    position: "absolute",
    right: Spacing.md,
    top: Spacing.md,
    opacity: 0.88,
  },
  premiumBadgeWrap: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
  },
  categoryBottom: {
    gap: Spacing.xs / 2,
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
  },
  categorySubtitle: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_400Regular",
    lineHeight: 15,
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  toolIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  toolText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  toolTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  toolTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  eventsCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.md,
  },
  eventTextWrap: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventName: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  eventDays: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
  },
});
