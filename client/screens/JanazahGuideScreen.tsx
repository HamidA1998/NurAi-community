import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  GeometricCardPattern,
  IslamicPatternBackground,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon, type AppIconName } from "@/components/icons";

type TabKey = "overview" | "washing" | "shrouding" | "prayer" | "burial";

interface Tab {
  key: TabKey;
  label: string;
  icon: AppIconName;
}

const TABS: Tab[] = [
  { key: "overview", label: "Overview", icon: "info" },
  { key: "washing", label: "Washing", icon: "droplet" },
  { key: "shrouding", label: "Shrouding", icon: "layers" },
  { key: "prayer", label: "Prayer", icon: "book" },
  { key: "burial", label: "Burial", icon: "map-pin" },
];

interface StepItem {
  id: number;
  title: string;
  description: string;
  arabic?: string;
  transliteration?: string;
  translation?: string;
  reference?: string;
}

const OVERVIEW_STEPS: StepItem[] = [
  {
    id: 1,
    title: "Importance of Janazah",
    description:
      "The Janazah rites are treated by Muslim communities as a serious communal responsibility. This guide is practical orientation only; for a real funeral, follow your local scholar, mosque, and licensed funeral provider.",
  },
  {
    id: 2,
    title: "Key Principles",
    description:
      'Three key principles govern the Islamic funeral: (1) Hasten the burial - the Prophet (peace be upon him) said: "Hasten the funeral, for if the deceased was righteous, you are forwarding them to goodness." (2) Treat the deceased with dignity and respect. (3) It is a collective obligation (fard kifayah) - if some Muslims perform it, the obligation is lifted from the rest.',
    reference: "Sahih al-Bukhari 1315",
  },
  {
    id: 3,
    title: "What to Say When Someone Dies",
    description:
      "Upon hearing of someone's death, Muslims often recite the Quranic words of returning to Allah.",
    arabic:
      "\u0625\u0650\u0646\u0651\u064E\u0627 \u0644\u0650\u0644\u0651\u064E\u0647\u0650 \u0648\u064E\u0625\u0650\u0646\u0651\u064E\u0627 \u0625\u0650\u0644\u064E\u064A\u0652\u0647\u0650 \u0631\u064E\u0627\u062C\u0650\u0639\u064F\u0648\u0646\u064E",
    transliteration: "Inna lillahi wa inna ilayhi raji'un",
    translation: "Indeed, to Allah we belong and to Him we shall return.",
    reference: "Quran 2:156",
  },
  {
    id: 4,
    title: "Dua for the Bereaved",
    description:
      "When offering condolences, it is recommended to make supplication for the deceased and for patience for their family.",
    arabic:
      "\u0625\u0650\u0646\u0651\u064E \u0644\u0650\u0644\u0651\u064E\u0647\u0650 \u0645\u064E\u0627 \u0623\u064E\u062E\u064E\u0630\u064E\u060C \u0648\u064E\u0644\u064E\u0647\u064F \u0645\u064E\u0627 \u0623\u064E\u0639\u0652\u0637\u064E\u0649\u060C \u0648\u064E\u0643\u064F\u0644\u0651\u064F \u0634\u064E\u064A\u0652\u0621\u064D \u0639\u0650\u0646\u0652\u062F\u064E\u0647\u064F \u0628\u0650\u0623\u064E\u062C\u064E\u0644\u064D \u0645\u064F\u0633\u064E\u0645\u0651\u064B\u0649\u060C \u0641\u064E\u0644\u0652\u062A\u064E\u0635\u0652\u0628\u0650\u0631\u0652 \u0648\u064E\u0644\u0652\u062A\u064E\u062D\u0652\u062A\u064E\u0633\u0650\u0628\u0652",
    transliteration:
      "Inna lillahi ma akhadha, wa lahu ma a'ta, wa kullu shay'in 'indahu bi ajalin musamman, faltasbir waltahtasib",
    translation:
      "To Allah belongs what He took, and to Him belongs what He gave. Everything with Him has an appointed time, so be patient and seek reward.",
    reference: "Sahih al-Bukhari 1284",
  },
  {
    id: 5,
    title: "Condolence Supplication",
    description:
      "Another recommended condolence phrase asking Allah to magnify the reward of the bereaved and grant them patience.",
    arabic:
      "\u0623\u064E\u0639\u0652\u0638\u064E\u0645\u064E \u0627\u0644\u0644\u0651\u064E\u0647\u064F \u0623\u064E\u062C\u0652\u0631\u064E\u0643\u064E\u060C \u0648\u064E\u0623\u064E\u062D\u0652\u0633\u064E\u0646\u064E \u0639\u064E\u0632\u064E\u0627\u0621\u064E\u0643\u064E\u060C \u0648\u064E\u063A\u064E\u0641\u064E\u0631\u064E \u0644\u0650\u0645\u064E\u064A\u0651\u0650\u062A\u0650\u0643\u064E",
    transliteration:
      "A'dhamal-lahu ajrak, wa ahsana 'aza'ak, wa ghafara limayyitik",
    translation:
      "May Allah magnify your reward, make your condolence good, and forgive your deceased.",
  },
];

const WASHING_STEPS: StepItem[] = [
  {
    id: 1,
    title: "Preparation",
    description:
      "The washer should be trustworthy and trained, with privacy protected throughout. Local practice may differ, so follow your mosque or funeral provider. Prepare a clean washing surface, warm water, sidr or soap, camphor where used, cotton, gloves, and clean cloths.",
  },
  {
    id: 2,
    title: "Place on Elevated Surface",
    description:
      "Place the deceased on a clean, elevated surface such as a washing table. Position the body so that the head is slightly raised. The washer should wear gloves and begin with Bismillah.",
    arabic:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650",
    transliteration: "Bismillah",
    translation: "In the name of Allah.",
  },
  {
    id: 3,
    title: "Cover the Awrah",
    description:
      "Cover the private area (awrah) of the deceased with a cloth. The awrah must remain covered throughout the entire washing process. The washer should not look at the private areas unnecessarily.",
  },
  {
    id: 4,
    title: "Press the Stomach Gently",
    description:
      "Gently press the lower abdomen of the deceased to expel any remaining waste from the body. This should be done carefully and with respect for the dignity of the deceased.",
  },
  {
    id: 5,
    title: "Clean the Private Parts",
    description:
      "Using a cloth wrapped around the hand, clean the private parts of the deceased without directly touching or looking at them. Use water to wash the area thoroughly.",
  },
  {
    id: 6,
    title: "Perform Wudu on the Deceased",
    description:
      "Perform the ablution (wudu) on the deceased as would be done for prayer - washing the face, arms to elbows, wiping the head, and washing the feet. However, water should not enter the mouth or nose; instead, wipe them with a damp cloth.",
    reference: "Sahih al-Bukhari 1253",
  },
  {
    id: 7,
    title: "Wash with Water and Sidr",
    description:
      "Wash the entire body starting from the right side, then the left. Use water mixed with sidr (lote tree leaves) or soap. Begin with the upper right side, then the lower right, followed by the upper left and lower left.",
    reference: "Sahih al-Bukhari 1253",
  },
  {
    id: 8,
    title: "Wash Three Times Minimum",
    description:
      'Wash the body a minimum of three times, or more if needed, always an odd number (3, 5, or 7). The Prophet (peace be upon him) instructed: "Wash her three or five times, or more than that if you see fit."',
    reference: "Sahih al-Bukhari 1253",
  },
  {
    id: 9,
    title: "Final Wash with Camphor",
    description:
      'In the final wash, add camphor to the water. The Prophet (peace be upon him) said: "Put camphor in the last washing." Camphor purifies and preserves the body and gives it a pleasant scent.',
    reference: "Sahih al-Bukhari 1253",
  },
  {
    id: 10,
    title: "Dry the Body",
    description:
      "After the final wash, gently dry the body with clean towels or cloths. Handle the body with care and respect throughout this process.",
  },
  {
    id: 11,
    title: "Apply Perfume",
    description:
      "Apply non-alcoholic perfume (such as musk or oud) on cotton and place it at the points of prostration: the forehead, nose, palms, knees, and feet. Perfume may also be applied to the shroud.",
  },
];

const SHROUDING_STEPS: StepItem[] = [
  {
    id: 1,
    title: "Materials",
    description:
      'The shroud (kafn) should be made of white cotton cloth. The Prophet (peace be upon him) said: "Wear white garments, for they are the best of your garments, and shroud your dead in them." The cloth should be clean, modest, and sufficient to cover the entire body.',
    reference: "Sunan Abu Dawud 3878",
  },
  {
    id: 2,
    title: "Shrouding for Men - Three Pieces",
    description:
      "A man is shrouded in three white cloths: (1) Izar - a lower wrap from the waist to the feet. (2) Qamis - a shirt or upper garment covering the torso. (3) Lifafah - a large wrap that covers the entire body from head to toe, larger than the body so it can be tied at both ends.",
    reference: "Sahih al-Bukhari 1264",
  },
  {
    id: 3,
    title: "Shrouding for Women - Five Pieces",
    description:
      "A woman is shrouded in five cloths: (1) Izar - a lower wrap. (2) Qamis - upper garment. (3) Khimar - head covering. (4) Lifafah - full body wrap. (5) Chest wrapper - an additional cloth to wrap around the chest area. The hair is placed over the qamis and covered by the khimar.",
    reference: "Sunan Abu Dawud 3157",
  },
  {
    id: 4,
    title: "Step-by-Step Wrapping",
    description:
      "Spread the lifafah (outer wrap) first, then place the izar on top. For women, place the chest wrapper as well. Lay the body on the cloths. Wrap the izar around the body first. For women, place the khimar over the head. Then fold the lifafah - bring the left side over the body first, then the right side over it.",
  },
  {
    id: 5,
    title: "Tying the Shroud",
    description:
      "Tie the shroud with strips of cloth (ropes) at the head, feet, and middle to keep the wrapping secure. These ties are loosened when the body is placed in the grave. Apply perfume to the shroud if desired.",
  },
];

const PRAYER_STEPS: StepItem[] = [
  {
    id: 1,
    title: "Who Should Lead the Prayer",
    description:
      "The most knowledgeable in the Quran and Sunnah should lead the funeral prayer. If the deceased left a will specifying someone, that person may lead. The imam stands at the head of a male deceased and at the middle of a female deceased.",
    reference: "Sahih Muslim 2066",
  },
  {
    id: 2,
    title: "Forming the Rows",
    description:
      "The congregation stands behind the imam in straight rows, as in regular prayer. There is no adhan or iqamah for the funeral prayer. The prayer is performed standing - there is no ruku (bowing) or sujud (prostration). It is recommended to have three or more rows.",
    reference: "Sunan Abu Dawud 3166",
  },
  {
    id: 3,
    title: "First Takbir - Surah Al-Fatihah",
    description:
      'Raise your hands and say "Allahu Akbar" for the first takbir. Then recite Surah Al-Fatihah silently. Seek refuge in Allah from Shaytan before reciting.',
    arabic:
      "\u0627\u0644\u0644\u0651\u064E\u0647\u064F \u0623\u064E\u0643\u0652\u0628\u064E\u0631\u064F\n\n\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0646\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650 \u00B7 \u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F \u0644\u0650\u0644\u0651\u064E\u0647\u0650 \u0631\u064E\u0628\u0651\u0650 \u0627\u0644\u0652\u0639\u064E\u0627\u0644\u064E\u0645\u0650\u064A\u0646\u064E \u00B7 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0646\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650 \u00B7 \u0645\u064E\u0627\u0644\u0650\u0643\u0650 \u064A\u064E\u0648\u0652\u0645\u0650 \u0627\u0644\u062F\u0651\u0650\u064A\u0646\u0650 \u00B7 \u0625\u0650\u064A\u0651\u064E\u0627\u0643\u064E \u0646\u064E\u0639\u0652\u0628\u064F\u062F\u064F \u0648\u064E\u0625\u0650\u064A\u0651\u064E\u0627\u0643\u064E \u0646\u064E\u0633\u0652\u062A\u064E\u0639\u0650\u064A\u0646\u064F \u00B7 \u0627\u0647\u0652\u062F\u0650\u0646\u064E\u0627 \u0627\u0644\u0635\u0651\u0650\u0631\u064E\u0627\u0637\u064E \u0627\u0644\u0652\u0645\u064F\u0633\u0652\u062A\u064E\u0642\u0650\u064A\u0645\u064E \u00B7 \u0635\u0650\u0631\u064E\u0627\u0637\u064E \u0627\u0644\u0651\u064E\u0630\u0650\u064A\u0646\u064E \u0623\u064E\u0646\u0652\u0639\u064E\u0645\u0652\u062A\u064E \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652 \u063A\u064E\u064A\u0652\u0631\u0650 \u0627\u0644\u0652\u0645\u064E\u063A\u0652\u0636\u064F\u0648\u0628\u0650 \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652 \u0648\u064E\u0644\u064E\u0627 \u0627\u0644\u0636\u0651\u064E\u0627\u0644\u0651\u0650\u064A\u0646\u064E",
    transliteration:
      "Allahu Akbar. Bismillahir-Rahmanir-Rahim. Al-hamdu lillahi Rabbil-'alamin. Ar-Rahmanir-Rahim. Maliki yawmid-din. Iyyaka na'budu wa iyyaka nasta'in. Ihdinas-siratal-mustaqim. Siratal-ladhina an'amta 'alayhim ghayril-maghdubi 'alayhim walad-dallin.",
    translation:
      "Allah is the Greatest. In the name of Allah, the Most Gracious, the Most Merciful. All praise is due to Allah, Lord of all the worlds. The Most Gracious, the Most Merciful. Master of the Day of Judgement. You alone we worship, and You alone we ask for help. Guide us to the straight path. The path of those upon whom You have bestowed favour, not of those who have earned anger nor of those who are astray.",
    reference: "Sahih al-Bukhari 1335",
  },
  {
    id: 4,
    title: "Second Takbir - Salawat on the Prophet",
    description:
      'Say "Allahu Akbar" for the second takbir without raising your hands. Then recite the Salawat al-Ibrahimiyyah (the same as recited in the Tashahhud of regular prayer).',
    arabic:
      "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0635\u064E\u0644\u0651\u0650 \u0639\u064E\u0644\u064E\u0649 \u0645\u064F\u062D\u064E\u0645\u0651\u064E\u062F\u064D \u0648\u064E\u0639\u064E\u0644\u064E\u0649 \u0622\u0644\u0650 \u0645\u064F\u062D\u064E\u0645\u0651\u064E\u062F\u064D\u060C \u0643\u064E\u0645\u064E\u0627 \u0635\u064E\u0644\u0651\u064E\u064A\u0652\u062A\u064E \u0639\u064E\u0644\u064E\u0649 \u0625\u0650\u0628\u0652\u0631\u064E\u0627\u0647\u0650\u064A\u0645\u064E \u0648\u064E\u0639\u064E\u0644\u064E\u0649 \u0622\u0644\u0650 \u0625\u0650\u0628\u0652\u0631\u064E\u0627\u0647\u0650\u064A\u0645\u064E\u060C \u0625\u0650\u0646\u0651\u064E\u0643\u064E \u062D\u064E\u0645\u0650\u064A\u062F\u064C \u0645\u064E\u062C\u0650\u064A\u062F\u064C\u060C \u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0628\u064E\u0627\u0631\u0650\u0643\u0652 \u0639\u064E\u0644\u064E\u0649 \u0645\u064F\u062D\u064E\u0645\u0651\u064E\u062F\u064D \u0648\u064E\u0639\u064E\u0644\u064E\u0649 \u0622\u0644\u0650 \u0645\u064F\u062D\u064E\u0645\u0651\u064E\u062F\u064D\u060C \u0643\u064E\u0645\u064E\u0627 \u0628\u064E\u0627\u0631\u064E\u0643\u0652\u062A\u064E \u0639\u064E\u0644\u064E\u0649 \u0625\u0650\u0628\u0652\u0631\u064E\u0627\u0647\u0650\u064A\u0645\u064E \u0648\u064E\u0639\u064E\u0644\u064E\u0649 \u0622\u0644\u0650 \u0625\u0650\u0628\u0652\u0631\u064E\u0627\u0647\u0650\u064A\u0645\u064E\u060C \u0625\u0650\u0646\u0651\u064E\u0643\u064E \u062D\u064E\u0645\u0650\u064A\u062F\u064C \u0645\u064E\u062C\u0650\u064A\u062F\u064C",
    transliteration:
      "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammadin, kama sallayta 'ala Ibrahima wa 'ala ali Ibrahima, innaka Hamidun Majid. Allahumma barik 'ala Muhammadin wa 'ala ali Muhammadin, kama barakta 'ala Ibrahima wa 'ala ali Ibrahima, innaka Hamidun Majid.",
    translation:
      "O Allah, send blessings upon Muhammad and upon the family of Muhammad, as You sent blessings upon Ibrahim and upon the family of Ibrahim. Indeed, You are Praiseworthy and Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim. Indeed, You are Praiseworthy and Glorious.",
    reference: "Sahih al-Bukhari 3370",
  },
  {
    id: 5,
    title: "Third Takbir - Dua for the Deceased",
    description:
      'Say "Allahu Akbar" for the third takbir. Then make sincere supplication for the deceased. The following is the authentic dua taught by the Prophet (peace be upon him):',
    arabic:
      "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0627\u063A\u0652\u0641\u0650\u0631\u0652 \u0644\u064E\u0647\u064F \u0648\u064E\u0627\u0631\u0652\u062D\u064E\u0645\u0652\u0647\u064F \u0648\u064E\u0639\u064E\u0627\u0641\u0650\u0647\u0650 \u0648\u064E\u0627\u0639\u0652\u0641\u064F \u0639\u064E\u0646\u0652\u0647\u064F\u060C \u0648\u064E\u0623\u064E\u0643\u0652\u0631\u0650\u0645\u0652 \u0646\u064F\u0632\u064F\u0644\u064E\u0647\u064F \u0648\u064E\u0648\u064E\u0633\u0651\u0650\u0639\u0652 \u0645\u064F\u062F\u0652\u062E\u064E\u0644\u064E\u0647\u064F\u060C \u0648\u064E\u0627\u063A\u0652\u0633\u0650\u0644\u0652\u0647\u064F \u0628\u0650\u0627\u0644\u0652\u0645\u064E\u0627\u0621\u0650 \u0648\u064E\u0627\u0644\u062B\u0651\u064E\u0644\u0652\u062C\u0650 \u0648\u064E\u0627\u0644\u0652\u0628\u064E\u0631\u064E\u062F\u0650\u060C \u0648\u064E\u0646\u064E\u0642\u0651\u0650\u0647\u0650 \u0645\u0650\u0646\u064E \u0627\u0644\u0652\u062E\u064E\u0637\u064E\u0627\u064A\u064E\u0627 \u0643\u064E\u0645\u064E\u0627 \u064A\u064F\u0646\u064E\u0642\u0651\u064E\u0649 \u0627\u0644\u062B\u0651\u064E\u0648\u0652\u0628\u064F \u0627\u0644\u0652\u0623\u064E\u0628\u0652\u064A\u064E\u0636\u064F \u0645\u0650\u0646\u064E \u0627\u0644\u062F\u0651\u064E\u0646\u064E\u0633\u0650\u060C \u0648\u064E\u0623\u064E\u0628\u0652\u062F\u0650\u0644\u0652\u0647\u064F \u062F\u064E\u0627\u0631\u064B\u0627 \u062E\u064E\u064A\u0652\u0631\u064B\u0627 \u0645\u0650\u0646\u0652 \u062F\u064E\u0627\u0631\u0650\u0647\u0650\u060C \u0648\u064E\u0623\u064E\u0647\u0652\u0644\u064B\u0627 \u062E\u064E\u064A\u0652\u0631\u064B\u0627 \u0645\u0650\u0646\u0652 \u0623\u064E\u0647\u0652\u0644\u0650\u0647\u0650\u060C \u0648\u064E\u0623\u064E\u062F\u0652\u062E\u0650\u0644\u0652\u0647\u064F \u0627\u0644\u0652\u062C\u064E\u0646\u0651\u064E\u0629\u064E \u0648\u064E\u0623\u064E\u0639\u0650\u0630\u0652\u0647\u064F \u0645\u0650\u0646\u0652 \u0639\u064E\u0630\u064E\u0627\u0628\u0650 \u0627\u0644\u0652\u0642\u064E\u0628\u0652\u0631\u0650 \u0648\u064E\u0639\u064E\u0630\u064E\u0627\u0628\u0650 \u0627\u0644\u0646\u0651\u064E\u0627\u0631\u0650",
    transliteration:
      "Allahummaghfir lahu warhamhu wa 'afihi wa'fu 'anhu, wa akrim nuzulahu wa wassi' mudkhalahu, waghsilhu bil-ma'i wath-thalji wal-barad, wa naqqihi minal-khataya kama yunaqqath-thawbul-abyadhu minad-danas, wa abdilhu daran khayran min darih, wa ahlan khayran min ahlih, wa adkhilhul-jannata wa a'idhhu min 'adhabil-qabri wa 'adhabin-nar.",
    translation:
      "O Allah, forgive him and have mercy on him, grant him well-being and pardon him, honour his reception and widen his entrance, wash him with water, snow and hail, and cleanse him of sins as a white garment is cleansed of dirt. Replace his home with a better home, and his family with a better family. Admit him to Paradise and protect him from the punishment of the grave and the punishment of the Fire.",
    reference: "Sahih Muslim 963",
  },
  {
    id: 6,
    title: "Fourth Takbir - Final Dua and Taslim",
    description:
      'Say "Allahu Akbar" for the fourth and final takbir. Make a brief supplication, then end the prayer with one taslim to the right side, saying "As-salamu \'alaykum wa rahmatullah."',
    arabic:
      "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0644\u064E\u0627 \u062A\u064E\u062D\u0652\u0631\u0650\u0645\u0652\u0646\u064E\u0627 \u0623\u064E\u062C\u0652\u0631\u064E\u0647\u064F \u0648\u064E\u0644\u064E\u0627 \u062A\u064E\u0641\u0652\u062A\u0650\u0646\u0651\u064E\u0627 \u0628\u064E\u0639\u0652\u062F\u064E\u0647\u064F\u060C \u0648\u064E\u0627\u063A\u0652\u0641\u0650\u0631\u0652 \u0644\u064E\u0646\u064E\u0627 \u0648\u064E\u0644\u064E\u0647\u064F\n\n\u0627\u0644\u0633\u0651\u064E\u0644\u064E\u0627\u0645\u064F \u0639\u064E\u0644\u064E\u064A\u0652\u0643\u064F\u0645\u0652 \u0648\u064E\u0631\u064E\u062D\u0652\u0645\u064E\u0629\u064F \u0627\u0644\u0644\u0651\u064E\u0647\u0650",
    transliteration:
      "Allahumma la tahrimna ajrahu wa la taftinna ba'dahu, waghfir lana wa lahu. As-salamu 'alaykum wa rahmatullah.",
    translation:
      "O Allah, do not deprive us of his reward and do not put us to trial after him, and forgive us and him. Peace be upon you and the mercy of Allah.",
    reference: "Sunan Ibn Majah 1498",
  },
];

const BURIAL_STEPS: StepItem[] = [
  {
    id: 1,
    title: "Preparing the Grave (Lahd)",
    description:
      'The preferred type of grave is the lahd (niche grave), where a recess is dug into the side of the grave facing the Qibla. The Prophet (peace be upon him) said: "The lahd is for us and the shaqq (trench) is for others." The shaqq is a trench dug in the middle of the grave floor. Both are permissible, but lahd is preferred.',
    reference: "Sunan Abu Dawud 3208",
  },
  {
    id: 2,
    title: "Lowering the Body",
    description:
      "Lower the body into the grave feet first from the side of the Qibla. The deceased should be placed on their right side, facing the direction of the Qibla (Makkah). Those lowering the body should recite the prescribed supplication.",
    arabic:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0648\u064E\u0639\u064E\u0644\u064E\u0649 \u0645\u0650\u0644\u0651\u064E\u0629\u0650 \u0631\u064E\u0633\u064F\u0648\u0644\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650",
    transliteration: "Bismillahi wa 'ala millati Rasulillah",
    translation:
      "In the name of Allah and upon the way of the Messenger of Allah.",
    reference: "Sunan Abu Dawud 3213",
  },
  {
    id: 3,
    title: "Positioning in the Grave",
    description:
      "Place the body on its right side facing the Qibla. The ties of the shroud are loosened. Bricks or flat stones are placed to seal the lahd niche, preventing soil from touching the body directly. The head should not be elevated on a pillow.",
  },
  {
    id: 4,
    title: "Covering with Soil",
    description:
      "Each person present should throw three handfuls of soil into the grave. The grave should be raised slightly above ground level (about a hand span) in a mound shape so it is recognised and not disrespected. It is prohibited to build structures or plaster over graves.",
    reference: "Sahih Muslim 970",
  },
  {
    id: 5,
    title: "Dua After Burial",
    description:
      'After the burial is complete, it is sunnah to stand at the grave and make supplication for the deceased. The Prophet (peace be upon him) would stand at the grave after burial and say: "Ask forgiveness for your brother and ask that he be made steadfast, for he is now being questioned."',
    arabic:
      "\u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u0627\u063A\u0652\u0641\u0650\u0631\u0652 \u0644\u064E\u0647\u064F\u060C \u0627\u0644\u0644\u0651\u064E\u0647\u064F\u0645\u0651\u064E \u062B\u064E\u0628\u0651\u0650\u062A\u0652\u0647\u064F",
    transliteration: "Allahummaghfir lahu, Allahumma thabbithu",
    translation: "O Allah, forgive him. O Allah, make him steadfast.",
    reference: "Sunan Abu Dawud 3221",
  },
  {
    id: 6,
    title: "Visiting the Grave",
    description:
      'Visiting graves is recommended as it reminds one of the Hereafter. The Prophet (peace be upon him) said: "Visit the graves, for they remind you of the Hereafter." When visiting, greet the inhabitants of the graves and make dua for them. Stand facing the grave as you would face a living person you are speaking to.',
    arabic:
      "\u0627\u0644\u0633\u0651\u064E\u0644\u064E\u0627\u0645\u064F \u0639\u064E\u0644\u064E\u064A\u0652\u0643\u064F\u0645\u0652 \u0623\u064E\u0647\u0652\u0644\u064E \u0627\u0644\u062F\u0651\u0650\u064A\u064E\u0627\u0631\u0650 \u0645\u0650\u0646\u064E \u0627\u0644\u0652\u0645\u064F\u0624\u0652\u0645\u0650\u0646\u0650\u064A\u0646\u064E \u0648\u064E\u0627\u0644\u0652\u0645\u064F\u0633\u0652\u0644\u0650\u0645\u0650\u064A\u0646\u064E\u060C \u0648\u064E\u0625\u0650\u0646\u0651\u064E\u0627 \u0625\u0650\u0646\u0652 \u0634\u064E\u0627\u0621\u064E \u0627\u0644\u0644\u0651\u064E\u0647\u064F \u0628\u0650\u0643\u064F\u0645\u0652 \u0644\u064E\u0627\u062D\u0650\u0642\u064F\u0648\u0646\u064E\u060C \u0646\u064E\u0633\u0652\u0623\u064E\u0644\u064F \u0627\u0644\u0644\u0651\u064E\u0647\u064E \u0644\u064E\u0646\u064E\u0627 \u0648\u064E\u0644\u064E\u0643\u064F\u0645\u064F \u0627\u0644\u0652\u0639\u064E\u0627\u0641\u0650\u064A\u064E\u0629\u064E",
    transliteration:
      "As-salamu 'alaykum ahlad-diyari minal-mu'minina wal-muslimin, wa inna in sha'Allahu bikum lahiqun, nas'alullaha lana wa lakumul-'afiyah.",
    translation:
      "Peace be upon you, O inhabitants of these dwellings, from among the believers and Muslims. Indeed, if Allah wills, we will join you. We ask Allah for well-being for us and for you.",
    reference: "Sahih Muslim 975",
  },
];

const TAB_DATA: Record<TabKey, StepItem[]> = {
  overview: OVERVIEW_STEPS,
  washing: WASHING_STEPS,
  shrouding: SHROUDING_STEPS,
  prayer: PRAYER_STEPS,
  burial: BURIAL_STEPS,
};

export default function JanazahGuideScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const steps = TAB_DATA[activeTab];
  const emerald = isDark ? CategoryColors.emerald.dark : CategoryColors.emerald;

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
          Janazah Guide
        </ThemedText>
        <View style={styles.backButton} />
      </View>

      <Animated.View
        entering={FadeInDown.duration(400)}
        style={styles.tabContainer}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive
                      ? theme.primary
                      : theme.backgroundSecondary,
                  },
                ]}
                testID={`tab-${tab.key}`}
              >
                <AppIcon
                  name={tab.icon}
                  size={14}
                  color={isActive ? theme.buttonText : theme.textSecondary}
                />
                <ThemedText
                  type="caption"
                  style={{
                    color: isActive ? theme.buttonText : theme.textSecondary,
                    fontWeight: "600",
                  }}
                >
                  {tab.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
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
              <GeometricCardPattern color={emerald.text} opacity={0.012} />
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
                          { color: isDark ? "#A78BFA" : "#7C3AED" },
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

              {step.reference ? (
                <View
                  style={[
                    styles.refBadge,
                    { backgroundColor: `${theme.textMuted}15` },
                  ]}
                >
                  <AppIcon name="book-open" size={10} color={theme.textMuted} />
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {step.reference}
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
    marginBottom: Spacing.lg,
  },
  tabScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  stepCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
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
    marginTop: Spacing.md,
    marginLeft: 44,
    gap: 4,
  },
});
