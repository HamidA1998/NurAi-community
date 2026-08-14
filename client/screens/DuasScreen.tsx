import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import * as Haptics from "expo-haptics";
import { toggleBookmark, isBookmarked } from "@/lib/bookmarks";
import { recordGardenAction } from "@/services/gardenService";
import { ThemedText } from "@/components/ThemedText";
import {
  DuaIconSvg,
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
import { useNurAI } from "@/context/NurAIContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { getDuaInsight, AIContextError } from "@/services/aiContextService";
import { mapAIContextResponseToModalData } from "@/services/personalAIResponseMapper";
import {
  AIResponseModal,
  AIResponseState,
  AIResponseData,
  customerSafeAIErrorMessage,
} from "@/components/AIResponseModal";
import { AppIcon, type AppIconName } from "@/components/icons";

interface Dua {
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
}

interface Category {
  name: string;
  icon: AppIconName;
  colorKey: keyof typeof CategoryColors;
  duas: Dua[];
}

const CATEGORIES: Category[] = [
  {
    name: "Morning",
    icon: "sunrise",
    colorKey: "amber",
    duas: [
      {
        arabic:
          "\u0623\u064e\u0635\u0652\u0628\u064e\u062d\u0652\u0646\u064e\u0627 \u0648\u064e\u0623\u064e\u0635\u0652\u0628\u064e\u062d\u064e \u0627\u0644\u0652\u0645\u064f\u0644\u0652\u0643\u064f \u0644\u0650\u0644\u064e\u0651\u0647\u0650",
        transliteration: "Asbahna wa asbahal mulku lillah",
        translation:
          "We have reached the morning and at this very time the whole kingdom belongs to Allah.",
        reference: "Sahih Muslim 2723a",
      },
      {
        arabic:
          "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0628\u0650\u0643\u064e \u0623\u064e\u0635\u0652\u0628\u064e\u062d\u0652\u0646\u064e\u0627 \u0648\u064e\u0628\u0650\u0643\u064e \u0623\u064e\u0645\u0652\u0633\u064e\u064a\u0652\u0646\u064e\u0627",
        transliteration: "Allahumma bika asbahna wa bika amsayna",
        translation:
          "O Allah, by Your leave we have reached the morning and by Your leave we have reached the evening.",
        reference: "Jami at-Tirmidhi 3391",
      },
      {
        arabic:
          "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0625\u0650\u0646\u0650\u0651\u064a \u0623\u064e\u0633\u0652\u0623\u064e\u0644\u064f\u0643\u064e \u0639\u0650\u0644\u0652\u0645\u064b\u0627 \u0646\u064e\u0627\u0641\u0650\u0639\u064b\u0627",
        transliteration: "Allahumma inni as'aluka 'ilman nafi'an",
        translation:
          "O Allah, I ask You for beneficial knowledge, good provision and acceptable deeds.",
        reference: "Sunan Ibn Majah 925",
      },
    ],
  },
  {
    name: "Evening",
    icon: "sunset",
    colorKey: "purple",
    duas: [
      {
        arabic:
          "\u0623\u064e\u0645\u0652\u0633\u064e\u064a\u0652\u0646\u064e\u0627 \u0648\u064e\u0623\u064e\u0645\u0652\u0633\u064e\u0649 \u0627\u0644\u0652\u0645\u064f\u0644\u0652\u0643\u064f \u0644\u0650\u0644\u064e\u0651\u0647\u0650",
        transliteration: "Amsayna wa amsal mulku lillah",
        translation:
          "We have reached the evening and at this very time the whole kingdom belongs to Allah.",
        reference: "Sahih Muslim 2723a",
      },
      {
        arabic:
          "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0625\u0650\u0646\u0650\u0651\u064a \u0623\u064e\u0639\u064f\u0648\u0630\u064f \u0628\u0650\u0643\u064e \u0645\u0650\u0646\u0652 \u0634\u064e\u0631\u0650\u0651 \u0645\u064e\u0627 \u0639\u064e\u0645\u0650\u0644\u0652\u062a\u064f",
        transliteration: "Allahumma inni a'udhu bika min sharri ma 'amiltu",
        translation:
          "O Allah, I seek refuge in You from the evil of what I have done.",
        reference: "Sahih Muslim 6898",
      },
      {
        arabic:
          "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u064e\u0651\u0647\u0650 \u0627\u0644\u064e\u0651\u0630\u0650\u064a \u0644\u064e\u0627 \u064a\u064e\u0636\u064f\u0631\u064f\u0651 \u0645\u064e\u0639\u064e \u0627\u0633\u0652\u0645\u0650\u0647\u0650 \u0634\u064e\u064a\u0652\u0621\u064c",
        transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un",
        translation:
          "In the name of Allah with whose name nothing can harm on earth or in heaven.",
        reference: "Sunan Abu Dawud 5088",
      },
    ],
  },
  {
    name: "Prayer",
    icon: "moon",
    colorKey: "blue",
    duas: [
      {
        arabic:
          "\u0633\u064f\u0628\u0652\u062d\u064e\u0627\u0646\u064e\u0643\u064e \u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0648\u064e\u0628\u0650\u062d\u064e\u0645\u0652\u062f\u0650\u0643\u064e",
        transliteration: "Subhanakallahumma wa bihamdika",
        translation: "Glory be to You O Allah, and praise be to You.",
        reference: "Jami at-Tirmidhi 243",
      },
      {
        arabic:
          "\u0631\u064e\u0628\u064e\u0651\u0646\u064e\u0627 \u0622\u062a\u0650\u0646\u064e\u0627 \u0641\u0650\u064a \u0627\u0644\u062f\u064f\u0651\u0646\u0652\u064a\u064e\u0627 \u062d\u064e\u0633\u064e\u0646\u064e\u0629\u064b",
        transliteration: "Rabbana atina fid-dunya hasanatan",
        translation:
          "Our Lord, give us in this world that which is good and in the Hereafter that which is good.",
        reference: "Quran 2:201",
      },
      {
        arabic:
          "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0625\u0650\u0646\u0650\u0651\u064a \u0623\u064e\u0639\u064f\u0648\u0630\u064f \u0628\u0650\u0643\u064e \u0645\u0650\u0646\u0652 \u0639\u064e\u0630\u064e\u0627\u0628\u0650 \u0627\u0644\u0642\u064e\u0628\u0652\u0631\u0650",
        transliteration: "Allahumma inni a'udhu bika min 'adhabil-qabr",
        translation:
          "O Allah, I seek refuge in You from the punishment of the grave.",
        reference: "Sahih Muslim 588",
      },
    ],
  },
  {
    name: "Travel",
    icon: "map",
    colorKey: "teal",
    duas: [
      {
        arabic:
          "\u0633\u064f\u0628\u0652\u062d\u064e\u0627\u0646\u064e \u0627\u0644\u064e\u0651\u0630\u0650\u064a \u0633\u064e\u062e\u064e\u0651\u0631\u064e \u0644\u064e\u0646\u064e\u0627 \u0647\u064e\u0630\u064e\u0627",
        transliteration: "Subhanal-ladhi sakh-khara lana hadha",
        translation:
          "Glory unto Him Who created this transportation for us though we were unable to create it on our own.",
        reference: "Quran 43:13",
      },
      {
        arabic:
          "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0625\u0650\u0646\u064e\u0651\u0627 \u0646\u064e\u0633\u0652\u0623\u064e\u0644\u064f\u0643\u064e \u0641\u0650\u064a \u0633\u064e\u0641\u064e\u0631\u0650\u0646\u064e\u0627 \u0647\u064e\u0630\u064e\u0627 \u0627\u0644\u0652\u0628\u0650\u0631\u064e\u0651 \u0648\u064e\u0627\u0644\u062a\u064e\u0651\u0642\u0652\u0648\u064e\u0649",
        transliteration:
          "Allahumma inna nas'aluka fi safarina hadhal-birra wat-taqwa",
        translation:
          "O Allah, we ask You on this journey for righteousness and piety.",
        reference: "Sahih Muslim 1342",
      },
      {
        arabic:
          "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0647\u064e\u0648\u0650\u0651\u0646\u0652 \u0639\u064e\u0644\u064e\u064a\u0652\u0646\u064e\u0627 \u0633\u064e\u0641\u064e\u0631\u064e\u0646\u064e\u0627 \u0647\u064e\u0630\u064e\u0627",
        transliteration: "Allahumma hawwin 'alayna safarana hadha",
        translation:
          "O Allah, make this journey easy for us and shorten its distance for us.",
        reference: "Sahih Muslim 1342",
      },
    ],
  },
  {
    name: "Food",
    icon: "coffee",
    colorKey: "orange",
    duas: [
      {
        arabic:
          "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u064e\u0651\u0647\u0650",
        transliteration: "Bismillah",
        translation: "In the name of Allah.",
        reference: "Sahih al-Bukhari 5376",
      },
      {
        arabic:
          "\u0627\u0644\u0652\u062d\u064e\u0645\u0652\u062f\u064f \u0644\u0650\u0644\u064e\u0651\u0647\u0650 \u0627\u0644\u064e\u0651\u0630\u0650\u064a \u0623\u064e\u0637\u0652\u0639\u064e\u0645\u064e\u0646\u064e\u0627 \u0648\u064e\u0633\u064e\u0642\u064e\u0627\u0646\u064e\u0627",
        transliteration: "Alhamdu lillahil-ladhi at'amana wa saqana",
        translation:
          "All praise is due to Allah who has given us food and drink.",
        reference: "Sunan Abu Dawud 3850",
      },
    ],
  },
  {
    name: "Sleep",
    icon: "moon",
    colorKey: "indigo",
    duas: [
      {
        arabic:
          "\u0628\u0650\u0627\u0633\u0652\u0645\u0650\u0643\u064e \u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0623\u064e\u0645\u064f\u0648\u062a\u064f \u0648\u064e\u0623\u064e\u062d\u0652\u064a\u064e\u0627",
        transliteration: "Bismika Allahumma amutu wa ahya",
        translation: "In Your name O Allah, I die and I live.",
        reference: "Sahih al-Bukhari 6324",
      },
      {
        arabic:
          "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0642\u0650\u0646\u0650\u064a \u0639\u064e\u0630\u064e\u0627\u0628\u064e\u0643\u064e \u064a\u064e\u0648\u0652\u0645\u064e \u062a\u064e\u0628\u0652\u0639\u064e\u062b\u064f \u0639\u0650\u0628\u064e\u0627\u062f\u064e\u0643\u064e",
        transliteration: "Allahumma qini 'adhabaka yawma tab'athu 'ibadak",
        translation:
          "O Allah, protect me from Your punishment on the day You resurrect Your servants.",
        reference: "Sunan Abu Dawud 5045",
      },
      {
        arabic:
          "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0628\u0650\u0627\u0633\u0652\u0645\u0650\u0643\u064e \u0623\u064e\u0636\u064e\u0639\u064f \u062c\u064e\u0646\u0652\u0628\u0650\u064a",
        transliteration: "Allahumma bismika ada'u janbi",
        translation: "O Allah, in Your name I lay my side down.",
        reference: "Sahih al-Bukhari 6320",
      },
    ],
  },
  {
    name: "General",
    icon: "heart",
    colorKey: "rose",
    duas: [
      {
        arabic:
          "\u0631\u064e\u0628\u064e\u0651\u0646\u064e\u0627 \u0644\u064e\u0627 \u062a\u064f\u0632\u0650\u063a\u0652 \u0642\u064f\u0644\u064f\u0648\u0628\u064e\u0646\u064e\u0627 \u0628\u064e\u0639\u0652\u062f\u064e \u0625\u0650\u0630\u0652 \u0647\u064e\u062f\u064e\u064a\u0652\u062a\u064e\u0646\u064e\u0627",
        transliteration: "Rabbana la tuzigh qulubana ba'da idh hadaytana",
        translation:
          "Our Lord, let not our hearts deviate after You have guided us.",
        reference: "Quran 3:8",
      },
      {
        arabic:
          "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0625\u0650\u0646\u0650\u0651\u064a \u0623\u064e\u0633\u0652\u0623\u064e\u0644\u064f\u0643\u064e \u0627\u0644\u0652\u0647\u064f\u062f\u064e\u0649 \u0648\u064e\u0627\u0644\u062a\u064f\u0651\u0642\u064e\u0649",
        transliteration: "Allahumma inni as'alukal-huda wat-tuqa",
        translation:
          "O Allah, I ask You for guidance, piety, chastity, and self-sufficiency.",
        reference: "Sahih Muslim 2721",
      },
    ],
  },
];

export default function DuasScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { getDuaRecommendationFn, trackFeature } = useNurAI();
  const { isPremium, isScholar } = useSubscription();
  const duaRec = getDuaRecommendationFn();
  const requestedInitialCategory = String(
    route.params?.initialCategory || duaRec.categoryName,
  );
  const initialExpandedCategory = CATEGORIES.some(
    (category) => category.name === requestedInitialCategory,
  )
    ? requestedInitialCategory
    : duaRec.categoryName;
  const [expanded, setExpanded] = useState<string | null>(
    initialExpandedCategory,
  );
  const [bookmarkedDuas, setBookmarkedDuas] = useState<Set<string>>(new Set());
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiState, setAiState] = useState<AIResponseState>("loading");
  const [aiData, setAiData] = useState<AIResponseData | null>(null);
  const [aiError, setAiError] = useState<string | undefined>();
  const [aiRetryParams, setAiRetryParams] = useState<{
    dua: Dua;
    category: string;
  } | null>(null);

  const handleDuaInsight = useCallback(
    async (dua: Dua, categoryName: string, question?: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!isPremium) {
        setAiState("upgrade");
        setAiData(null);
        setAiError(undefined);
        setAiModalVisible(true);
        return;
      }

      setAiRetryParams({ dua, category: categoryName });
      setAiState("loading");
      setAiData(null);
      setAiError(undefined);
      setAiModalVisible(true);

      try {
        const result = await getDuaInsight({
          duaName: dua.transliteration,
          arabicText: dua.arabic,
          translation: dua.translation,
          category: categoryName,
          question,
          userTier: isScholar ? "scholar" : "premium",
        });
        setAiData(mapAIContextResponseToModalData(result));
        setAiState("success");
      } catch (err) {
        if (err instanceof AIContextError) {
          if (err.code === "UPGRADE_REQUIRED") {
            setAiState("upgrade");
          } else if (err.code === "RATE_LIMIT") {
            setAiState("rateLimit");
          } else {
            setAiError(customerSafeAIErrorMessage(err.message));
            setAiState("error");
          }
        } else {
          setAiError("Something went wrong. Please try again.");
          setAiState("error");
        }
      }
    },
    [isPremium, isScholar],
  );

  const handleAiRetry = useCallback(() => {
    if (aiRetryParams) {
      handleDuaInsight(aiRetryParams.dua, aiRetryParams.category);
    }
  }, [aiRetryParams, handleDuaInsight]);

  const handleAiFollowUp = useCallback(
    (prompt: string) => {
      if (!aiRetryParams) return;
      handleDuaInsight(aiRetryParams.dua, aiRetryParams.category, prompt);
    },
    [aiRetryParams, handleDuaInsight],
  );

  useEffect(() => {
    const checkBookmarks = async () => {
      const marked = new Set<string>();
      for (const cat of CATEGORIES) {
        for (const dua of cat.duas) {
          const key = `${cat.name}-${dua.transliteration}`;
          const isMarked = await isBookmarked("dua", dua.transliteration);
          if (isMarked) marked.add(key);
        }
      }
      setBookmarkedDuas(marked);
    };
    checkBookmarks();
  }, []);

  const handleBookmarkDua = async (dua: Dua, categoryName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const key = `${categoryName}-${dua.transliteration}`;
    const nowBookmarked = await toggleBookmark({
      type: "dua",
      title: dua.transliteration,
      arabic: dua.arabic,
      translation: dua.translation,
      reference: `${categoryName} - ${dua.reference}`,
    });
    setBookmarkedDuas((prev) => {
      const next = new Set(prev);
      if (nowBookmarked) next.add(key);
      else next.delete(key);
      return next;
    });
    if (nowBookmarked) {
      recordGardenAction("dhikr").catch(() => {});
    }
  };

  useEffect(() => {
    trackFeature("duas");
  }, [trackFeature]);

  const toggleCategory = (name: string) => {
    setExpanded(expanded === name ? null : name);
  };

  const getColor = (key: keyof typeof CategoryColors) => {
    const c = CategoryColors[key];
    return isDark ? c.dark : c;
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
        <ThemedText type="h4">Duas</ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={
              isDark
                ? [theme.gradientStart, theme.gradientMid]
                : [theme.gradientLightBg, theme.gradientLightBg2]
            }
            style={styles.recCard}
          >
            <GeometricCardPattern color={theme.primary} opacity={0.012} />
            <View style={styles.recHeader}>
              <View
                style={[styles.recDot, { backgroundColor: theme.primaryText }]}
              />
              <ThemedText
                style={[styles.recLabel, { color: theme.primaryText }]}
              >
                NurAI Suggests
              </ThemedText>
            </View>
            <View style={styles.recBody}>
              <DuaIconSvg
                size={28}
                color={theme.primaryText}
                accentColor={theme.scholar}
              />
              <ThemedText
                style={[styles.recReason, { color: theme.primaryText }]}
              >
                {duaRec.reason}
              </ThemedText>
            </View>
            <ThemedText style={[styles.recHint, { color: theme.primaryText }]}>
              Tap {duaRec.categoryName} below
            </ThemedText>
          </LinearGradient>
        </Animated.View>

        {CATEGORIES.map((cat, catIndex) => {
          const color = getColor(cat.colorKey);
          const isExpanded = expanded === cat.name;
          return (
            <Animated.View
              key={cat.name}
              entering={FadeInDown.delay(catIndex * 60).duration(300)}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.categoryHeader,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => toggleCategory(cat.name)}
                testID={`category-${cat.name.toLowerCase()}`}
              >
                <View style={[styles.catIcon, { backgroundColor: color.bg }]}>
                  <AppIcon name={cat.icon} size={22} color={color.text} />
                </View>
                <ThemedText style={styles.catName}>{cat.name}</ThemedText>
                <View
                  style={[styles.countBadge, { backgroundColor: color.bg }]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: color.text, fontWeight: "600" }}
                  >
                    {cat.duas.length}
                  </ThemedText>
                </View>
                <AppIcon
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>

              {isExpanded ? (
                <>
                  <View style={styles.verticalLineContainer}>
                    <LinearGradient
                      colors={[color.text, "transparent"]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.verticalLine}
                    />
                  </View>
                  <View style={styles.duasList}>
                    {cat.duas.map((dua, i) => (
                      <View
                        key={i}
                        style={[
                          styles.duaCard,
                          {
                            backgroundColor: theme.surfaceGlass,
                            borderColor: theme.borderSubtle,
                            borderLeftWidth: 4,
                            borderLeftColor: color.text,
                          },
                        ]}
                      >
                        <View style={styles.duaCardHeader}>
                          <View style={styles.duaCardArabicWrap}>
                            <ThemedText style={styles.duaArabic}>
                              {dua.arabic}
                            </ThemedText>
                            <GoldDivider
                              color={color.text}
                              opacity={0.38}
                              style={styles.duaGoldDivider}
                            />
                          </View>
                          <View style={styles.duaCardActions}>
                            <Pressable
                              onPress={() => handleDuaInsight(dua, cat.name)}
                              hitSlop={8}
                              testID={`ai-insight-dua-${cat.name}-${i}`}
                              style={({ pressed }) => [
                                pressed ? { opacity: 0.6 } : null,
                                styles.duaActionBtn,
                              ]}
                            >
                              <View
                                style={[
                                  styles.aiInsightIcon,
                                  { backgroundColor: theme.primaryMuted },
                                ]}
                              >
                                <AppIcon
                                  name="zap"
                                  size={14}
                                  color={theme.primary}
                                />
                              </View>
                            </Pressable>
                            <Pressable
                              onPress={() => handleBookmarkDua(dua, cat.name)}
                              hitSlop={8}
                              testID={`bookmark-dua-${cat.name}-${i}`}
                              style={({ pressed }) => [
                                pressed ? { opacity: 0.6 } : null,
                                styles.duaBookmarkBtn,
                              ]}
                            >
                              <AppIcon
                                name="bookmark"
                                size={18}
                                color={
                                  bookmarkedDuas.has(
                                    `${cat.name}-${dua.transliteration}`,
                                  )
                                    ? theme.primary
                                    : theme.textMuted
                                }
                              />
                            </Pressable>
                          </View>
                        </View>
                        <ThemedText
                          type="small"
                          style={[styles.duaTranslit, { color: color.text }]}
                        >
                          {dua.transliteration}
                        </ThemedText>
                        <ThemedText
                          type="body"
                          style={{ color: theme.textSecondary }}
                        >
                          {dua.translation}
                        </ThemedText>
                        <View
                          style={[
                            styles.refBadge,
                            { backgroundColor: `${theme.textMuted}15` },
                          ]}
                        >
                          <ThemedText
                            type="caption"
                            style={{ color: theme.textMuted }}
                          >
                            {dua.reference}
                          </ThemedText>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </Animated.View>
          );
        })}
      </ScrollView>

      <AIResponseModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        state={aiState}
        data={aiData}
        onRetry={handleAiRetry}
        onFollowUp={handleAiFollowUp}
        errorMessage={aiError}
        featureLabel="Dua Insight"
        requiredTier="premium"
      />
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
  scrollContent: { paddingHorizontal: Spacing.lg },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  catIcon: {
    width: Spacing["5xl"],
    height: Spacing["5xl"],
    borderRadius: Spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  catName: { flex: 1, fontSize: 16, fontWeight: "500" },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  verticalLineContainer: {
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  verticalLine: {
    width: 2,
    height: 20,
    borderRadius: 1,
  },
  duasList: { marginBottom: Spacing.md, gap: Spacing.sm },
  duaCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  duaArabic: {
    fontSize: 26,
    textAlign: "right",
    lineHeight: 48,
    fontWeight: "400",
  },
  duaGoldDivider: {
    marginTop: -Spacing.xs,
    marginBottom: Spacing.xs,
  },
  duaTranslit: {
    fontStyle: "italic",
  },
  refBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
  },
  duaCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  duaCardArabicWrap: {
    flex: 1,
  },
  duaCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  duaActionBtn: {
    paddingLeft: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  duaBookmarkBtn: {
    paddingLeft: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  aiInsightIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  recCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  recHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  recDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  recLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  recBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  recReason: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  recHint: {
    fontSize: 11,
    fontStyle: "italic",
    opacity: 0.8,
  },
});
