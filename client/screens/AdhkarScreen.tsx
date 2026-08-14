import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
  TasbeehIconSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { syncedSetItem } from "@/lib/progress-sync";
import { AppIcon } from "@/components/icons";

interface AdhkarItem {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
  count: number;
}

interface AdhkarState {
  [id: string]: number;
}

const MORNING_ADHKAR: AdhkarItem[] = [
  {
    id: "m_ayatul_kursi",
    arabic:
      "\u0627\u0644\u0644\u0651\u064e\u0647\u064f \u0644\u064e\u0627 \u0625\u0650\u0644\u064e\u0670\u0647\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0647\u064f\u0648\u064e \u0627\u0644\u0652\u062d\u064e\u064a\u064f\u0651 \u0627\u0644\u0652\u0642\u064e\u064a\u064f\u0651\u0648\u0645\u064f \u06da \u0644\u064e\u0627 \u062a\u064e\u0623\u0652\u062e\u064f\u0630\u064f\u0647\u064f \u0633\u0650\u0646\u064e\u0629\u064c \u0648\u064e\u0644\u064e\u0627 \u0646\u064e\u0648\u0652\u0645\u064c \u06da \u0644\u064e\u0647\u064f \u0645\u064e\u0627 \u0641\u0650\u064a \u0627\u0644\u0633\u064e\u0651\u0645\u064e\u0627\u0648\u064e\u0627\u062a\u0650 \u0648\u064e\u0645\u064e\u0627 \u0641\u0650\u064a \u0627\u0644\u0652\u0623\u064e\u0631\u0652\u0636\u0650 \u06da \u0645\u064e\u0646 \u0630\u064e\u0627 \u0627\u0644\u064e\u0651\u0630\u0650\u064a \u064a\u064e\u0634\u0652\u0641\u064e\u0639\u064f \u0639\u0650\u0646\u0652\u062f\u064e\u0647\u064f \u0625\u0650\u0644\u064e\u0651\u0627 \u0628\u0650\u0625\u0650\u0630\u0652\u0646\u0650\u0647\u0650 \u06da \u064a\u064e\u0639\u0652\u0644\u064e\u0645\u064f \u0645\u064e\u0627 \u0628\u064e\u064a\u0652\u0646\u064e \u0623\u064e\u064a\u0652\u062f\u0650\u064a\u0647\u0650\u0645\u0652 \u0648\u064e\u0645\u064e\u0627 \u062e\u064e\u0644\u0652\u0641\u064e\u0647\u064f\u0645\u0652 \u06da \u0648\u064e\u0644\u064e\u0627 \u064a\u064f\u062d\u0650\u064a\u0637\u064f\u0648\u0646\u064e \u0628\u0650\u0634\u064e\u064a\u0652\u0621\u064d \u0645\u0650\u0646\u0652 \u0639\u0650\u0644\u0652\u0645\u0650\u0647\u0650 \u0625\u0650\u0644\u064e\u0651\u0627 \u0628\u0650\u0645\u064e\u0627 \u0634\u064e\u0627\u0621\u064e \u06da \u0648\u064e\u0633\u0650\u0639\u064e \u0643\u064f\u0631\u0652\u0633\u0650\u064a\u064f\u0651\u0647\u064f \u0627\u0644\u0633\u064e\u0651\u0645\u064e\u0627\u0648\u064e\u0627\u062a\u0650 \u0648\u064e\u0627\u0644\u0652\u0623\u064e\u0631\u0652\u0636\u064e \u06da \u0648\u064e\u0644\u064e\u0627 \u064a\u064e\u0626\u064f\u0648\u062f\u064f\u0647\u064f \u062d\u0650\u0641\u0652\u0638\u064f\u0647\u064f\u0645\u064e\u0627 \u06da \u0648\u064e\u0647\u064f\u0648\u064e \u0627\u0644\u0652\u0639\u064e\u0644\u0650\u064a\u064f\u0651 \u0627\u0644\u0652\u0639\u064e\u0638\u0650\u064a\u0645\u064f",
    transliteration:
      "Allahu la ilaha illa Huwal-Hayyul-Qayyum. La ta'khudhuhu sinatun wa la nawm. Lahu ma fis-samawati wa ma fil-ard. Man dhal-ladhi yashfa'u 'indahu illa bi-idhnih. Ya'lamu ma bayna aydihim wa ma khalfahum. Wa la yuhituna bi shay'in min 'ilmihi illa bima sha'. Wasi'a kursiyyuhus-samawati wal-ard. Wa la ya'uduhu hifdhuhuma. Wa Huwal-'Aliyyul-'Adheem.",
    translation:
      "Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
    reference: "Quran 2:255",
    count: 1,
  },
  {
    id: "m_ikhlas",
    arabic:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0650\u064a\u0645\u0650\u06d7 \u0642\u064f\u0644\u0652 \u0647\u064f\u0648\u064e \u0627\u0644\u0644\u0651\u064e\u0647\u064f \u0623\u064e\u062d\u064e\u062f\u064c\u06d7 \u0627\u0644\u0644\u0651\u064e\u0647\u064f \u0627\u0644\u0635\u064e\u0651\u0645\u064e\u062f\u064f\u06d7 \u0644\u064e\u0645\u0652 \u064a\u064e\u0644\u0650\u062f\u0652 \u0648\u064e\u0644\u064e\u0645\u0652 \u064a\u064f\u0648\u0644\u064e\u062f\u0652\u06d7 \u0648\u064e\u0644\u064e\u0645\u0652 \u064a\u064e\u0643\u064f\u0646 \u0644\u064e\u0647\u064f \u0643\u064f\u0641\u064f\u0648\u064b\u0627 \u0623\u064e\u062d\u064e\u062f\u064c",
    transliteration:
      "Bismillahir-Rahmanir-Raheem. Qul Huwa Allahu Ahad. Allahus-Samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.",
    translation:
      "In the name of Allah, the Most Gracious, the Most Merciful. Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born. Nor is there to Him any equivalent.",
    reference: "Quran 112:1-4",
    count: 3,
  },
  {
    id: "m_falaq",
    arabic:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0650\u064a\u0645\u0650\u06d7 \u0642\u064f\u0644\u0652 \u0623\u064e\u0639\u064f\u0648\u0630\u064f \u0628\u0650\u0631\u064e\u0628\u064e\u0651 \u0627\u0644\u0652\u0641\u064e\u0644\u064e\u0642\u0650\u06d7 \u0645\u0650\u0646 \u0634\u064e\u0631\u064e\u0651 \u0645\u064e\u0627 \u062e\u064e\u0644\u064e\u0642\u064e\u06d7 \u0648\u064e\u0645\u0650\u0646 \u0634\u064e\u0631\u064e\u0651 \u063a\u064e\u0627\u0633\u0650\u0642\u064d \u0625\u0650\u0630\u064e\u0627 \u0648\u064e\u0642\u064e\u0628\u064e\u06d7 \u0648\u064e\u0645\u0650\u0646 \u0634\u064e\u0631\u064e\u0651 \u0627\u0644\u0646\u064e\u0651\u0641\u064e\u0651\u0627\u062b\u064e\u0627\u062a\u0650 \u0641\u0650\u064a \u0627\u0644\u0652\u0639\u064f\u0642\u064e\u062f\u0650\u06d7 \u0648\u064e\u0645\u0650\u0646 \u0634\u064e\u0631\u064e\u0651 \u062d\u064e\u0627\u0633\u0650\u062f\u064d \u0625\u0650\u0630\u064e\u0627 \u062d\u064e\u0633\u064e\u062f\u064e",
    transliteration:
      "Bismillahir-Rahmanir-Raheem. Qul a'udhu bi Rabbil-falaq. Min sharri ma khalaq. Wa min sharri ghasiqin idha waqab. Wa min sharrin-naffathati fil-'uqad. Wa min sharri hasidin idha hasad.",
    translation:
      "In the name of Allah, the Most Gracious, the Most Merciful. Say: I seek refuge with the Lord of the daybreak. From the evil of what He has created. And from the evil of darkness when it settles. And from the evil of the blowers in knots. And from the evil of an envier when he envies.",
    reference: "Quran 113:1-5",
    count: 3,
  },
  {
    id: "m_nas",
    arabic:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0650\u064a\u0645\u0650\u06d7 \u0642\u064f\u0644\u0652 \u0623\u064e\u0639\u064f\u0648\u0630\u064f \u0628\u0650\u0631\u064e\u0628\u064e\u0651 \u0627\u0644\u0646\u064e\u0651\u0627\u0633\u0650\u06d7 \u0645\u064e\u0644\u0650\u0643\u0650 \u0627\u0644\u0646\u064e\u0651\u0627\u0633\u0650\u06d7 \u0625\u0650\u0644\u064e\u0670\u0647\u0650 \u0627\u0644\u0646\u064e\u0651\u0627\u0633\u0650\u06d7 \u0645\u0650\u0646 \u0634\u064e\u0631\u064e\u0651 \u0627\u0644\u0652\u0648\u064e\u0633\u0652\u0648\u064e\u0627\u0633\u0650 \u0627\u0644\u0652\u062e\u064e\u0646\u064e\u0651\u0627\u0633\u0650\u06d7 \u0627\u0644\u064e\u0651\u0630\u0650\u064a \u064a\u064f\u0648\u064e\u0633\u0652\u0648\u0650\u0633\u064f \u0641\u0650\u064a \u0635\u064f\u062f\u064f\u0648\u0631\u0650 \u0627\u0644\u0646\u064e\u0651\u0627\u0633\u0650\u06d7 \u0645\u0650\u0646\u064e \u0627\u0644\u0652\u062c\u0650\u0646\u064e\u0651\u0629\u0650 \u0648\u064e\u0627\u0644\u0646\u064e\u0651\u0627\u0633\u0650",
    transliteration:
      "Bismillahir-Rahmanir-Raheem. Qul a'udhu bi Rabbin-nas. Malikin-nas. Ilahin-nas. Min sharril-waswasil-khannas. Alladhi yuwaswisu fi sudurin-nas. Minal-jinnati wan-nas.",
    translation:
      "In the name of Allah, the Most Gracious, the Most Merciful. Say: I seek refuge with the Lord of mankind. The Sovereign of mankind. The God of mankind. From the evil of the retreating whisperer. Who whispers in the breasts of mankind. Among jinn and among mankind.",
    reference: "Quran 114:1-6",
    count: 3,
  },
  {
    id: "m_asbahna",
    arabic:
      "\u0623\u064e\u0635\u0652\u0628\u064e\u062d\u0652\u0646\u064e\u0627 \u0648\u064e\u0623\u064e\u0635\u0652\u0628\u064e\u062d\u064e \u0627\u0644\u0652\u0645\u064f\u0644\u0652\u0643\u064f \u0644\u0650\u0644\u064e\u0651\u0647\u0650\u060c \u0648\u064e\u0627\u0644\u0652\u062d\u064e\u0645\u0652\u062f\u064f \u0644\u0650\u0644\u064e\u0651\u0647\u0650\u060c \u0644\u064e\u0627 \u0625\u0650\u0644\u064e\u0670\u0647\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0627\u0644\u0644\u064e\u0651\u0647\u064f \u0648\u064e\u062d\u0652\u062f\u064e\u0647\u064f \u0644\u064e\u0627 \u0634\u064e\u0631\u0650\u064a\u0643\u064e \u0644\u064e\u0647\u064f\u060c \u0644\u064e\u0647\u064f \u0627\u0644\u0652\u0645\u064f\u0644\u0652\u0643\u064f \u0648\u064e\u0644\u064e\u0647\u064f \u0627\u0644\u0652\u062d\u064e\u0645\u0652\u062f\u064f \u0648\u064e\u0647\u064f\u0648\u064e \u0639\u064e\u0644\u064e\u0649\u0670 \u0643\u064f\u0644\u064e\u0651 \u0634\u064e\u064a\u0652\u0621\u064d \u0642\u064e\u062f\u0650\u064a\u0631\u064c\u060c \u0631\u064e\u0628\u064e\u0651 \u0623\u064e\u0633\u0652\u0623\u064e\u0644\u064f\u0643\u064e \u062e\u064e\u064a\u0652\u0631\u064e \u0645\u064e\u0627 \u0641\u0650\u064a \u0647\u064e\u0670\u0630\u064e\u0627 \u0627\u0644\u0652\u064a\u064e\u0648\u0652\u0645\u0650 \u0648\u064e\u062e\u064e\u064a\u0652\u0631\u064e \u0645\u064e\u0627 \u0628\u064e\u0639\u0652\u062f\u064e\u0647\u064f\u060c \u0648\u064e\u0623\u064e\u0639\u064f\u0648\u0630\u064f \u0628\u0650\u0643\u064e \u0645\u0650\u0646\u0652 \u0634\u064e\u0631\u064e\u0651 \u0645\u064e\u0627 \u0641\u0650\u064a \u0647\u064e\u0670\u0630\u064e\u0627 \u0627\u0644\u0652\u064a\u064e\u0648\u0652\u0645\u0650 \u0648\u064e\u0634\u064e\u0631\u064e\u0651 \u0645\u064e\u0627 \u0628\u064e\u0639\u0652\u062f\u064e\u0647\u064f",
    transliteration:
      "Asbahna wa asbahal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in Qadir. Rabbi as'aluka khayra ma fi hadhal-yawmi wa khayra ma ba'dah, wa a'udhu bika min sharri ma fi hadhal-yawmi wa sharri ma ba'dah.",
    translation:
      "We have reached the morning and at this very time the whole kingdom belongs to Allah. All praise is due to Allah. None has the right to be worshipped except Allah alone, without partner. To Him belongs all sovereignty and praise, and He is over all things omnipotent. My Lord, I ask You for the good of this day and the good of what follows it, and I seek refuge in You from the evil of this day and the evil of what follows it.",
    reference: "Sahih Muslim 2723a",
    count: 1,
  },
  {
    id: "m_bika_asbahna",
    arabic:
      "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0628\u0650\u0643\u064e \u0623\u064e\u0635\u0652\u0628\u064e\u062d\u0652\u0646\u064e\u0627 \u0648\u064e\u0628\u0650\u0643\u064e \u0623\u064e\u0645\u0652\u0633\u064e\u064a\u0652\u0646\u064e\u0627\u060c \u0648\u064e\u0628\u0650\u0643\u064e \u0646\u064e\u062d\u0652\u064a\u064e\u0627 \u0648\u064e\u0628\u0650\u0643\u064e \u0646\u064e\u0645\u064f\u0648\u062a\u064f \u0648\u064e\u0625\u0650\u0644\u064e\u064a\u0652\u0643\u064e \u0627\u0644\u0646\u064f\u0651\u0634\u064f\u0648\u0631\u064f",
    transliteration:
      "Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namutu, wa ilaykan-nushur.",
    translation:
      "O Allah, by Your leave we have reached the morning, and by Your leave we have reached the evening. By Your leave we live and by Your leave we die, and unto You is the resurrection.",
    reference: "Jami at-Tirmidhi 3391",
    count: 1,
  },
  {
    id: "m_ushhiduka",
    arabic:
      "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0625\u0650\u0646\u064e\u0651\u064a \u0623\u064e\u0635\u0652\u0628\u064e\u062d\u0652\u062a\u064f \u0623\u064f\u0634\u0652\u0647\u0650\u062f\u064f\u0643\u064e \u0648\u064e\u0623\u064f\u0634\u0652\u0647\u0650\u062f\u064f \u062d\u064e\u0645\u064e\u0644\u064e\u0629\u064e \u0639\u064e\u0631\u0652\u0634\u0650\u0643\u064e\u060c \u0648\u064e\u0645\u064e\u0644\u064e\u0627\u0626\u0650\u0643\u064e\u062a\u064e\u0643\u064e\u060c \u0648\u064e\u062c\u064e\u0645\u0650\u064a\u0639\u064e \u062e\u064e\u0644\u0652\u0642\u0650\u0643\u064e\u060c \u0623\u064e\u0646\u064e\u0651\u0643\u064e \u0623\u064e\u0646\u0652\u062a\u064e \u0627\u0644\u0644\u064e\u0651\u0647\u064f \u0644\u064e\u0627 \u0625\u0650\u0644\u064e\u0670\u0647\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0623\u064e\u0646\u0652\u062a\u064e \u0648\u064e\u062d\u0652\u062f\u064e\u0643\u064e \u0644\u064e\u0627 \u0634\u064e\u0631\u0650\u064a\u0643\u064e \u0644\u064e\u0643\u064e\u060c \u0648\u064e\u0623\u064e\u0646\u064e\u0651 \u0645\u064f\u062d\u064e\u0645\u064e\u0651\u062f\u064b\u0627 \u0639\u064e\u0628\u0652\u062f\u064f\u0643\u064e \u0648\u064e\u0631\u064e\u0633\u064f\u0648\u0644\u064f\u0643\u064e",
    transliteration:
      "Allahumma inni asbahtu ush-hiduka wa ush-hidu hamalata 'arshika, wa mala'ikataka, wa jami'a khalqika, annaka Antallahu la ilaha illa Anta wahdaka la sharika laka, wa anna Muhammadan 'abduka wa rasuluk.",
    translation:
      "O Allah, verily I have reached the morning and call on You, the bearers of Your Throne, Your angels, and all of Your creation to witness that You are Allah, none has the right to be worshipped except You, alone, without partner, and that Muhammad is Your servant and messenger.",
    reference: "Sunan Abu Dawud 5069",
    count: 4,
  },
  {
    id: "m_sayyid_istighfar",
    arabic:
      "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0623\u064e\u0646\u0652\u062a\u064e \u0631\u064e\u0628\u064e\u0651\u064a \u0644\u064e\u0627 \u0625\u0650\u0644\u064e\u0670\u0647\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0623\u064e\u0646\u0652\u062a\u064e\u060c \u062e\u064e\u0644\u064e\u0642\u0652\u062a\u064e\u0646\u0650\u064a \u0648\u064e\u0623\u064e\u0646\u064e\u0627 \u0639\u064e\u0628\u0652\u062f\u064f\u0643\u064e\u060c \u0648\u064e\u0623\u064e\u0646\u064e\u0627 \u0639\u064e\u0644\u064e\u0649\u0670 \u0639\u064e\u0647\u0652\u062f\u0650\u0643\u064e \u0648\u064e\u0648\u064e\u0639\u0652\u062f\u0650\u0643\u064e \u0645\u064e\u0627 \u0627\u0633\u0652\u062a\u064e\u0637\u064e\u0639\u0652\u062a\u064f\u060c \u0623\u064e\u0639\u064f\u0648\u0630\u064f \u0628\u0650\u0643\u064e \u0645\u0650\u0646\u0652 \u0634\u064e\u0631\u064e\u0651 \u0645\u064e\u0627 \u0635\u064e\u0646\u064e\u0639\u0652\u062a\u064f\u060c \u0623\u064e\u0628\u064f\u0648\u0621\u064f \u0644\u064e\u0643\u064e \u0628\u0650\u0646\u0650\u0639\u0652\u0645\u064e\u062a\u0650\u0643\u064e \u0639\u064e\u0644\u064e\u064a\u064e\u0651\u060c \u0648\u064e\u0623\u064e\u0628\u064f\u0648\u0621\u064f \u0628\u0650\u0630\u064e\u0646\u0652\u0628\u0650\u064a\u060c \u0641\u064e\u0627\u063a\u0652\u0641\u0650\u0631\u0652 \u0644\u0650\u064a \u0641\u064e\u0625\u0650\u0646\u064e\u0651\u0647\u064f \u0644\u064e\u0627 \u064a\u064e\u063a\u0652\u0641\u0650\u0631\u064f \u0627\u0644\u0630\u064f\u0651\u0646\u064f\u0648\u0628\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0623\u064e\u0646\u0652\u062a\u064e",
    transliteration:
      "Allahumma Anta Rabbi la ilaha illa Anta, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika mastata'tu, a'udhu bika min sharri ma sana'tu, abu'u laka bi ni'matika 'alayya, wa abu'u bi dhanbi, faghfir li fa innahu la yaghfirudh-dhunuba illa Anta.",
    translation:
      "O Allah, You are my Lord, none has the right to be worshipped except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil I have done. I acknowledge Your favour upon me, and I acknowledge my sin, so forgive me, for verily none can forgive sins except You.",
    reference: "Sahih al-Bukhari 6306",
    count: 1,
  },
  {
    id: "m_afiyah",
    arabic:
      "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0625\u0650\u0646\u064e\u0651\u064a \u0623\u064e\u0633\u0652\u0623\u064e\u0644\u064f\u0643\u064e \u0627\u0644\u0652\u0639\u064e\u0627\u0641\u0650\u064a\u064e\u0629\u064e \u0641\u0650\u064a \u0627\u0644\u062f\u064f\u0651\u0646\u0652\u064a\u064e\u0627 \u0648\u064e\u0627\u0644\u0652\u0622\u062e\u0650\u0631\u064e\u0629\u0650\u060c \u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0625\u0650\u0646\u064e\u0651\u064a \u0623\u064e\u0633\u0652\u0623\u064e\u0644\u064f\u0643\u064e \u0627\u0644\u0652\u0639\u064e\u0641\u0652\u0648\u064e \u0648\u064e\u0627\u0644\u0652\u0639\u064e\u0627\u0641\u0650\u064a\u064e\u0629\u064e \u0641\u0650\u064a \u062f\u0650\u064a\u0646\u0650\u064a \u0648\u064e\u062f\u064f\u0646\u0652\u064a\u064e\u0627\u064a\u064e \u0648\u064e\u0623\u064e\u0647\u0652\u0644\u0650\u064a \u0648\u064e\u0645\u064e\u0627\u0644\u0650\u064a\u060c \u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0627\u0633\u0652\u062a\u064f\u0631\u0652 \u0639\u064e\u0648\u0652\u0631\u064e\u0627\u062a\u0650\u064a \u0648\u064e\u0622\u0645\u0650\u0646\u0652 \u0631\u064e\u0648\u0652\u0639\u064e\u0627\u062a\u0650\u064a",
    transliteration:
      "Allahumma inni as'alukal-'afiyata fid-dunya wal-akhirah. Allahumma inni as'alukal-'afwa wal-'afiyata fi dini wa dunyaya wa ahli wa mali. Allahum-mastur 'awrati wa amin raw'ati.",
    translation:
      "O Allah, I ask You for well-being in this world and the Hereafter. O Allah, I ask You for pardon and well-being in my religious and worldly affairs, and my family and my wealth. O Allah, veil my weaknesses and set at ease my dismay.",
    reference: "Sunan Abu Dawud 5074",
    count: 1,
  },
  {
    id: "m_ilman_nafian",
    arabic:
      "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0625\u0650\u0646\u064e\u0651\u064a \u0623\u064e\u0633\u0652\u0623\u064e\u0644\u064f\u0643\u064e \u0639\u0650\u0644\u0652\u0645\u064b\u0627 \u0646\u064e\u0627\u0641\u0650\u0639\u064b\u0627\u060c \u0648\u064e\u0631\u0650\u0632\u0652\u0642\u064b\u0627 \u0637\u064e\u064a\u064e\u0651\u0628\u064b\u0627\u060c \u0648\u064e\u0639\u064e\u0645\u064e\u0644\u064b\u0627 \u0645\u064f\u062a\u064e\u0642\u064e\u0628\u064e\u0651\u0644\u064b\u0627",
    transliteration:
      "Allahumma inni as'aluka 'ilman nafi'an, wa rizqan tayyiban, wa 'amalan mutaqabbalan.",
    translation:
      "O Allah, I ask You for beneficial knowledge, good provision, and acceptable deeds.",
    reference: "Sunan Ibn Majah 925",
    count: 1,
  },
  {
    id: "m_subhanallahi_bihamdihi",
    arabic:
      "\u0633\u064f\u0628\u0652\u062d\u064e\u0627\u0646\u064e \u0627\u0644\u0644\u064e\u0651\u0647\u0650 \u0648\u064e\u0628\u0650\u062d\u064e\u0645\u0652\u062f\u0650\u0647\u0650",
    transliteration: "Subhanallahi wa bihamdihi",
    translation:
      "Glory and praise be to Allah. Whoever says this one hundred times a day will have his sins forgiven even if they were as much as the foam of the sea.",
    reference: "Sahih al-Bukhari 6405",
    count: 100,
  },
  {
    id: "m_la_ilaha_illallah",
    arabic:
      "\u0644\u064e\u0627 \u0625\u0650\u0644\u064e\u0670\u0647\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0627\u0644\u0644\u064e\u0651\u0647\u064f \u0648\u064e\u062d\u0652\u062f\u064e\u0647\u064f \u0644\u064e\u0627 \u0634\u064e\u0631\u0650\u064a\u0643\u064e \u0644\u064e\u0647\u064f\u060c \u0644\u064e\u0647\u064f \u0627\u0644\u0652\u0645\u064f\u0644\u0652\u0643\u064f \u0648\u064e\u0644\u064e\u0647\u064f \u0627\u0644\u0652\u062d\u064e\u0645\u0652\u062f\u064f\u060c \u0648\u064e\u0647\u064f\u0648\u064e \u0639\u064e\u0644\u064e\u0649\u0670 \u0643\u064f\u0644\u064e\u0651 \u0634\u064e\u064a\u0652\u0621\u064d \u0642\u064e\u062f\u0650\u064a\u0631\u064c",
    transliteration:
      "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in Qadir.",
    translation:
      "None has the right to be worshipped except Allah, alone, without partner. To Him belongs all sovereignty and praise, and He is over all things omnipotent.",
    reference: "Sahih al-Bukhari 3293",
    count: 10,
  },
  {
    id: "m_subhanallahi_azeem",
    arabic:
      "\u0633\u064f\u0628\u0652\u062d\u064e\u0627\u0646\u064e \u0627\u0644\u0644\u064e\u0651\u0647\u0650 \u0648\u064e\u0628\u0650\u062d\u064e\u0645\u0652\u062f\u0650\u0647\u0650\u060c \u0633\u064f\u0628\u0652\u062d\u064e\u0627\u0646\u064e \u0627\u0644\u0644\u064e\u0651\u0647\u0650 \u0627\u0644\u0652\u0639\u064e\u0638\u0650\u064a\u0645\u0650",
    transliteration: "Subhanallahi wa bihamdihi, Subhanallahil-'Adheem.",
    translation:
      "Glory and praise be to Allah. Glory be to Allah, the Supreme. Two words which are light on the tongue, heavy on the Scale, and beloved to the Most Merciful.",
    reference: "Sahih al-Bukhari 6406",
    count: 3,
  },
  {
    id: "m_la_hawla",
    arabic:
      "\u0644\u064e\u0627 \u062d\u064e\u0648\u0652\u0644\u064e \u0648\u064e\u0644\u064e\u0627 \u0642\u064f\u0648\u064e\u0651\u0629\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0628\u0650\u0627\u0644\u0644\u064e\u0651\u0647\u0650",
    transliteration: "La hawla wa la quwwata illa billah.",
    translation:
      "There is no might nor power except with Allah. It is a treasure from the treasures of Paradise.",
    reference: "Sahih al-Bukhari 6384",
    count: 10,
  },
  {
    id: "m_astaghfirullah",
    arabic:
      "\u0623\u064e\u0633\u0652\u062a\u064e\u063a\u0652\u0641\u0650\u0631\u064f \u0627\u0644\u0644\u064e\u0651\u0647\u064e",
    transliteration: "Astaghfirullah.",
    translation: "I seek forgiveness from Allah.",
    reference: "Sahih Muslim 591",
    count: 3,
  },
  {
    id: "m_hasbiyallah",
    arabic:
      "\u062d\u064e\u0633\u0652\u0628\u0650\u064a\u064e \u0627\u0644\u0644\u064e\u0651\u0647\u064f \u0644\u064e\u0627 \u0625\u0650\u0644\u064e\u0670\u0647\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0647\u064f\u0648\u064e\u060c \u0639\u064e\u0644\u064e\u064a\u0652\u0647\u0650 \u062a\u064e\u0648\u064e\u0643\u064e\u0651\u0644\u0652\u062a\u064f \u0648\u064e\u0647\u064f\u0648\u064e \u0631\u064e\u0628\u064f\u0651 \u0627\u0644\u0652\u0639\u064e\u0631\u0652\u0634\u0650 \u0627\u0644\u0652\u0639\u064e\u0638\u0650\u064a\u0645\u0650",
    transliteration:
      "Hasbiyallahu la ilaha illa Huwa, 'alayhi tawakkaltu wa Huwa Rabbul-'Arshil-'Adheem.",
    translation:
      "Allah is sufficient for me. There is no deity except Him. Upon Him I have relied, and He is the Lord of the Great Throne.",
    reference: "Sunan Abu Dawud 5081",
    count: 7,
  },
  {
    id: "m_salli_ala_muhammad",
    arabic:
      "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0635\u064e\u0644\u064e\u0651 \u0648\u064e\u0633\u064e\u0644\u064e\u0651\u0645\u0652 \u0639\u064e\u0644\u064e\u0649\u0670 \u0646\u064e\u0628\u0650\u064a\u064e\u0651\u0646\u064e\u0627 \u0645\u064f\u062d\u064e\u0645\u064e\u0651\u062f\u064d",
    transliteration: "Allahumma salli wa sallim 'ala nabiyyina Muhammad.",
    translation: "O Allah, send prayers and peace upon our Prophet Muhammad.",
    reference: "Quran 33:56",
    count: 1,
  },
];

const EVENING_ADHKAR: AdhkarItem[] = [
  {
    id: "e_ayatul_kursi",
    arabic:
      "\u0627\u0644\u0644\u0651\u064e\u0647\u064f \u0644\u064e\u0627 \u0625\u0650\u0644\u064e\u0670\u0647\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0647\u064f\u0648\u064e \u0627\u0644\u0652\u062d\u064e\u064a\u064f\u0651 \u0627\u0644\u0652\u0642\u064e\u064a\u064f\u0651\u0648\u0645\u064f \u06da \u0644\u064e\u0627 \u062a\u064e\u0623\u0652\u062e\u064f\u0630\u064f\u0647\u064f \u0633\u0650\u0646\u064e\u0629\u064c \u0648\u064e\u0644\u064e\u0627 \u0646\u064e\u0648\u0652\u0645\u064c \u06da \u0644\u064e\u0647\u064f \u0645\u064e\u0627 \u0641\u0650\u064a \u0627\u0644\u0633\u064e\u0651\u0645\u064e\u0627\u0648\u064e\u0627\u062a\u0650 \u0648\u064e\u0645\u064e\u0627 \u0641\u0650\u064a \u0627\u0644\u0652\u0623\u064e\u0631\u0652\u0636\u0650 \u06da \u0645\u064e\u0646 \u0630\u064e\u0627 \u0627\u0644\u064e\u0651\u0630\u0650\u064a \u064a\u064e\u0634\u0652\u0641\u064e\u0639\u064f \u0639\u0650\u0646\u0652\u062f\u064e\u0647\u064f \u0625\u0650\u0644\u064e\u0651\u0627 \u0628\u0650\u0625\u0650\u0630\u0652\u0646\u0650\u0647\u0650 \u06da \u064a\u064e\u0639\u0652\u0644\u064e\u0645\u064f \u0645\u064e\u0627 \u0628\u064e\u064a\u0652\u0646\u064e \u0623\u064e\u064a\u0652\u062f\u0650\u064a\u0647\u0650\u0645\u0652 \u0648\u064e\u0645\u064e\u0627 \u062e\u064e\u0644\u0652\u0641\u064e\u0647\u064f\u0645\u0652 \u06da \u0648\u064e\u0644\u064e\u0627 \u064a\u064f\u062d\u0650\u064a\u0637\u064f\u0648\u0646\u064e \u0628\u0650\u0634\u064e\u064a\u0652\u0621\u064d \u0645\u0650\u0646\u0652 \u0639\u0650\u0644\u0652\u0645\u0650\u0647\u0650 \u0625\u0650\u0644\u064e\u0651\u0627 \u0628\u0650\u0645\u064e\u0627 \u0634\u064e\u0627\u0621\u064e \u06da \u0648\u064e\u0633\u0650\u0639\u064e \u0643\u064f\u0631\u0652\u0633\u0650\u064a\u064f\u0651\u0647\u064f \u0627\u0644\u0633\u064e\u0651\u0645\u064e\u0627\u0648\u064e\u0627\u062a\u0650 \u0648\u064e\u0627\u0644\u0652\u0623\u064e\u0631\u0652\u0636\u064e \u06da \u0648\u064e\u0644\u064e\u0627 \u064a\u064e\u0626\u064f\u0648\u062f\u064f\u0647\u064f \u062d\u0650\u0641\u0652\u0638\u064f\u0647\u064f\u0645\u064e\u0627 \u06da \u0648\u064e\u0647\u064f\u0648\u064e \u0627\u0644\u0652\u0639\u064e\u0644\u0650\u064a\u064f\u0651 \u0627\u0644\u0652\u0639\u064e\u0638\u0650\u064a\u0645\u064f",
    transliteration:
      "Allahu la ilaha illa Huwal-Hayyul-Qayyum. La ta'khudhuhu sinatun wa la nawm. Lahu ma fis-samawati wa ma fil-ard. Man dhal-ladhi yashfa'u 'indahu illa bi-idhnih. Ya'lamu ma bayna aydihim wa ma khalfahum. Wa la yuhituna bi shay'in min 'ilmihi illa bima sha'. Wasi'a kursiyyuhus-samawati wal-ard. Wa la ya'uduhu hifdhuhuma. Wa Huwal-'Aliyyul-'Adheem.",
    translation:
      "Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
    reference: "Quran 2:255",
    count: 1,
  },
  {
    id: "e_ikhlas",
    arabic:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0650\u064a\u0645\u0650\u06d7 \u0642\u064f\u0644\u0652 \u0647\u064f\u0648\u064e \u0627\u0644\u0644\u0651\u064e\u0647\u064f \u0623\u064e\u062d\u064e\u062f\u064c\u06d7 \u0627\u0644\u0644\u0651\u064e\u0647\u064f \u0627\u0644\u0635\u064e\u0651\u0645\u064e\u062f\u064f\u06d7 \u0644\u064e\u0645\u0652 \u064a\u064e\u0644\u0650\u062f\u0652 \u0648\u064e\u0644\u064e\u0645\u0652 \u064a\u064f\u0648\u0644\u064e\u062f\u0652\u06d7 \u0648\u064e\u0644\u064e\u0645\u0652 \u064a\u064e\u0643\u064f\u0646 \u0644\u064e\u0647\u064f \u0643\u064f\u0641\u064f\u0648\u064b\u0627 \u0623\u064e\u062d\u064e\u062f\u064c",
    transliteration:
      "Bismillahir-Rahmanir-Raheem. Qul Huwa Allahu Ahad. Allahus-Samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.",
    translation:
      "In the name of Allah, the Most Gracious, the Most Merciful. Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born. Nor is there to Him any equivalent.",
    reference: "Quran 112:1-4",
    count: 3,
  },
  {
    id: "e_falaq",
    arabic:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0650\u064a\u0645\u0650\u06d7 \u0642\u064f\u0644\u0652 \u0623\u064e\u0639\u064f\u0648\u0630\u064f \u0628\u0650\u0631\u064e\u0628\u064e\u0651 \u0627\u0644\u0652\u0641\u064e\u0644\u064e\u0642\u0650\u06d7 \u0645\u0650\u0646 \u0634\u064e\u0631\u064e\u0651 \u0645\u064e\u0627 \u062e\u064e\u0644\u064e\u0642\u064e\u06d7 \u0648\u064e\u0645\u0650\u0646 \u0634\u064e\u0631\u064e\u0651 \u063a\u064e\u0627\u0633\u0650\u0642\u064d \u0625\u0650\u0630\u064e\u0627 \u0648\u064e\u0642\u064e\u0628\u064e\u06d7 \u0648\u064e\u0645\u0650\u0646 \u0634\u064e\u0631\u064e\u0651 \u0627\u0644\u0646\u064e\u0651\u0641\u064e\u0651\u0627\u062b\u064e\u0627\u062a\u0650 \u0641\u0650\u064a \u0627\u0644\u0652\u0639\u064f\u0642\u064e\u062f\u0650\u06d7 \u0648\u064e\u0645\u0650\u0646 \u0634\u064e\u0631\u064e\u0651 \u062d\u064e\u0627\u0633\u0650\u062f\u064d \u0625\u0650\u0630\u064e\u0627 \u062d\u064e\u0633\u064e\u062f\u064e",
    transliteration:
      "Bismillahir-Rahmanir-Raheem. Qul a'udhu bi Rabbil-falaq. Min sharri ma khalaq. Wa min sharri ghasiqin idha waqab. Wa min sharrin-naffathati fil-'uqad. Wa min sharri hasidin idha hasad.",
    translation:
      "In the name of Allah, the Most Gracious, the Most Merciful. Say: I seek refuge with the Lord of the daybreak. From the evil of what He has created. And from the evil of darkness when it settles. And from the evil of the blowers in knots. And from the evil of an envier when he envies.",
    reference: "Quran 113:1-5",
    count: 3,
  },
  {
    id: "e_nas",
    arabic:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0650\u064a\u0645\u0650\u06d7 \u0642\u064f\u0644\u0652 \u0623\u064e\u0639\u064f\u0648\u0630\u064f \u0628\u0650\u0631\u064e\u0628\u064e\u0651 \u0627\u0644\u0646\u064e\u0651\u0627\u0633\u0650\u06d7 \u0645\u064e\u0644\u0650\u0643\u0650 \u0627\u0644\u0646\u064e\u0651\u0627\u0633\u0650\u06d7 \u0625\u0650\u0644\u064e\u0670\u0647\u0650 \u0627\u0644\u0646\u064e\u0651\u0627\u0633\u0650\u06d7 \u0645\u0650\u0646 \u0634\u064e\u0631\u064e\u0651 \u0627\u0644\u0652\u0648\u064e\u0633\u0652\u0648\u064e\u0627\u0633\u0650 \u0627\u0644\u0652\u062e\u064e\u0646\u064e\u0651\u0627\u0633\u0650\u06d7 \u0627\u0644\u064e\u0651\u0630\u0650\u064a \u064a\u064f\u0648\u064e\u0633\u0652\u0648\u0650\u0633\u064f \u0641\u0650\u064a \u0635\u064f\u062f\u064f\u0648\u0631\u0650 \u0627\u0644\u0646\u064e\u0651\u0627\u0633\u0650\u06d7 \u0645\u0650\u0646\u064e \u0627\u0644\u0652\u062c\u0650\u0646\u064e\u0651\u0629\u0650 \u0648\u064e\u0627\u0644\u0646\u064e\u0651\u0627\u0633\u0650",
    transliteration:
      "Bismillahir-Rahmanir-Raheem. Qul a'udhu bi Rabbin-nas. Malikin-nas. Ilahin-nas. Min sharril-waswasil-khannas. Alladhi yuwaswisu fi sudurin-nas. Minal-jinnati wan-nas.",
    translation:
      "In the name of Allah, the Most Gracious, the Most Merciful. Say: I seek refuge with the Lord of mankind. The Sovereign of mankind. The God of mankind. From the evil of the retreating whisperer. Who whispers in the breasts of mankind. Among jinn and among mankind.",
    reference: "Quran 114:1-6",
    count: 3,
  },
  {
    id: "e_amsayna",
    arabic:
      "\u0623\u064e\u0645\u0652\u0633\u064e\u064a\u0652\u0646\u064e\u0627 \u0648\u064e\u0623\u064e\u0645\u0652\u0633\u064e\u0649 \u0627\u0644\u0652\u0645\u064f\u0644\u0652\u0643\u064f \u0644\u0650\u0644\u064e\u0651\u0647\u0650\u060c \u0648\u064e\u0627\u0644\u0652\u062d\u064e\u0645\u0652\u062f\u064f \u0644\u0650\u0644\u064e\u0651\u0647\u0650\u060c \u0644\u064e\u0627 \u0625\u0650\u0644\u064e\u0670\u0647\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0627\u0644\u0644\u064e\u0651\u0647\u064f \u0648\u064e\u062d\u0652\u062f\u064e\u0647\u064f \u0644\u064e\u0627 \u0634\u064e\u0631\u0650\u064a\u0643\u064e \u0644\u064e\u0647\u064f\u060c \u0644\u064e\u0647\u064f \u0627\u0644\u0652\u0645\u064f\u0644\u0652\u0643\u064f \u0648\u064e\u0644\u064e\u0647\u064f \u0627\u0644\u0652\u062d\u064e\u0645\u0652\u062f\u064f \u0648\u064e\u0647\u064f\u0648\u064e \u0639\u064e\u0644\u064e\u0649\u0670 \u0643\u064f\u0644\u064e\u0651 \u0634\u064e\u064a\u0652\u0621\u064d \u0642\u064e\u062f\u0650\u064a\u0631\u064c\u060c \u0631\u064e\u0628\u064e\u0651 \u0623\u064e\u0633\u0652\u0623\u064e\u0644\u064f\u0643\u064e \u062e\u064e\u064a\u0652\u0631\u064e \u0645\u064e\u0627 \u0641\u0650\u064a \u0647\u064e\u0670\u0630\u0650\u0647\u0650 \u0627\u0644\u0644\u064e\u0651\u064a\u0652\u0644\u064e\u0629\u0650 \u0648\u064e\u062e\u064e\u064a\u0652\u0631\u064e \u0645\u064e\u0627 \u0628\u064e\u0639\u0652\u062f\u064e\u0647\u064e\u0627\u060c \u0648\u064e\u0623\u064e\u0639\u064f\u0648\u0630\u064f \u0628\u0650\u0643\u064e \u0645\u0650\u0646\u0652 \u0634\u064e\u0631\u064e\u0651 \u0645\u064e\u0627 \u0641\u0650\u064a \u0647\u064e\u0670\u0630\u0650\u0647\u0650 \u0627\u0644\u0644\u064e\u0651\u064a\u0652\u0644\u064e\u0629\u0650 \u0648\u064e\u0634\u064e\u0631\u064e\u0651 \u0645\u064e\u0627 \u0628\u064e\u0639\u0652\u062f\u064e\u0647\u064e\u0627",
    transliteration:
      "Amsayna wa amsal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in Qadir. Rabbi as'aluka khayra ma fi hadhihil-laylati wa khayra ma ba'daha, wa a'udhu bika min sharri ma fi hadhihil-laylati wa sharri ma ba'daha.",
    translation:
      "We have reached the evening and at this very time the whole kingdom belongs to Allah. All praise is due to Allah. None has the right to be worshipped except Allah alone, without partner. To Him belongs all sovereignty and praise, and He is over all things omnipotent. My Lord, I ask You for the good of this night and the good of what follows it, and I seek refuge in You from the evil of this night and the evil of what follows it.",
    reference: "Sahih Muslim 2723a",
    count: 1,
  },
  {
    id: "e_bika_amsayna",
    arabic:
      "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0628\u0650\u0643\u064e \u0623\u064e\u0645\u0652\u0633\u064e\u064a\u0652\u0646\u064e\u0627 \u0648\u064e\u0628\u0650\u0643\u064e \u0623\u064e\u0635\u0652\u0628\u064e\u062d\u0652\u0646\u064e\u0627\u060c \u0648\u064e\u0628\u0650\u0643\u064e \u0646\u064e\u062d\u0652\u064a\u064e\u0627 \u0648\u064e\u0628\u0650\u0643\u064e \u0646\u064e\u0645\u064f\u0648\u062a\u064f \u0648\u064e\u0625\u0650\u0644\u064e\u064a\u0652\u0643\u064e \u0627\u0644\u0652\u0645\u064e\u0635\u0650\u064a\u0631\u064f",
    transliteration:
      "Allahumma bika amsayna, wa bika asbahna, wa bika nahya, wa bika namutu, wa ilaykal-masir.",
    translation:
      "O Allah, by Your leave we have reached the evening, and by Your leave we have reached the morning. By Your leave we live and by Your leave we die, and unto You is the return.",
    reference: "Jami at-Tirmidhi 3391",
    count: 1,
  },
  {
    id: "e_ushhiduka",
    arabic:
      "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0625\u0650\u0646\u064e\u0651\u064a \u0623\u064e\u0645\u0652\u0633\u064e\u064a\u0652\u062a\u064f \u0623\u064f\u0634\u0652\u0647\u0650\u062f\u064f\u0643\u064e \u0648\u064e\u0623\u064f\u0634\u0652\u0647\u0650\u062f\u064f \u062d\u064e\u0645\u064e\u0644\u064e\u0629\u064e \u0639\u064e\u0631\u0652\u0634\u0650\u0643\u064e\u060c \u0648\u064e\u0645\u064e\u0644\u064e\u0627\u0626\u0650\u0643\u064e\u062a\u064e\u0643\u064e\u060c \u0648\u064e\u062c\u064e\u0645\u0650\u064a\u0639\u064e \u062e\u064e\u0644\u0652\u0642\u0650\u0643\u064e\u060c \u0623\u064e\u0646\u064e\u0651\u0643\u064e \u0623\u064e\u0646\u0652\u062a\u064e \u0627\u0644\u0644\u064e\u0651\u0647\u064f \u0644\u064e\u0627 \u0625\u0650\u0644\u064e\u0670\u0647\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0623\u064e\u0646\u0652\u062a\u064e \u0648\u064e\u062d\u0652\u062f\u064e\u0643\u064e \u0644\u064e\u0627 \u0634\u064e\u0631\u0650\u064a\u0643\u064e \u0644\u064e\u0643\u064e\u060c \u0648\u064e\u0623\u064e\u0646\u064e\u0651 \u0645\u064f\u062d\u064e\u0645\u064e\u0651\u062f\u064b\u0627 \u0639\u064e\u0628\u0652\u062f\u064f\u0643\u064e \u0648\u064e\u0631\u064e\u0633\u064f\u0648\u0644\u064f\u0643\u064e",
    transliteration:
      "Allahumma inni amsaytu ush-hiduka wa ush-hidu hamalata 'arshika, wa mala'ikataka, wa jami'a khalqika, annaka Antallahu la ilaha illa Anta wahdaka la sharika laka, wa anna Muhammadan 'abduka wa rasuluk.",
    translation:
      "O Allah, verily I have reached the evening and call on You, the bearers of Your Throne, Your angels, and all of Your creation to witness that You are Allah, none has the right to be worshipped except You, alone, without partner, and that Muhammad is Your servant and messenger.",
    reference: "Sunan Abu Dawud 5069",
    count: 4,
  },
  {
    id: "e_sayyid_istighfar",
    arabic:
      "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0623\u064e\u0646\u0652\u062a\u064e \u0631\u064e\u0628\u064e\u0651\u064a \u0644\u064e\u0627 \u0625\u0650\u0644\u064e\u0670\u0647\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0623\u064e\u0646\u0652\u062a\u064e\u060c \u062e\u064e\u0644\u064e\u0642\u0652\u062a\u064e\u0646\u0650\u064a \u0648\u064e\u0623\u064e\u0646\u064e\u0627 \u0639\u064e\u0628\u0652\u062f\u064f\u0643\u064e\u060c \u0648\u064e\u0623\u064e\u0646\u064e\u0627 \u0639\u064e\u0644\u064e\u0649\u0670 \u0639\u064e\u0647\u0652\u062f\u0650\u0643\u064e \u0648\u064e\u0648\u064e\u0639\u0652\u062f\u0650\u0643\u064e \u0645\u064e\u0627 \u0627\u0633\u0652\u062a\u064e\u0637\u064e\u0639\u0652\u062a\u064f\u060c \u0623\u064e\u0639\u064f\u0648\u0630\u064f \u0628\u0650\u0643\u064e \u0645\u0650\u0646\u0652 \u0634\u064e\u0631\u064e\u0651 \u0645\u064e\u0627 \u0635\u064e\u0646\u064e\u0639\u0652\u062a\u064f\u060c \u0623\u064e\u0628\u064f\u0648\u0621\u064f \u0644\u064e\u0643\u064e \u0628\u0650\u0646\u0650\u0639\u0652\u0645\u064e\u062a\u0650\u0643\u064e \u0639\u064e\u0644\u064e\u064a\u064e\u0651\u060c \u0648\u064e\u0623\u064e\u0628\u064f\u0648\u0621\u064f \u0628\u0650\u0630\u064e\u0646\u0652\u0628\u0650\u064a\u060c \u0641\u064e\u0627\u063a\u0652\u0641\u0650\u0631\u0652 \u0644\u0650\u064a \u0641\u064e\u0625\u0650\u0646\u064e\u0651\u0647\u064f \u0644\u064e\u0627 \u064a\u064e\u063a\u0652\u0641\u0650\u0631\u064f \u0627\u0644\u0630\u064f\u0651\u0646\u064f\u0648\u0628\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0623\u064e\u0646\u0652\u062a\u064e",
    transliteration:
      "Allahumma Anta Rabbi la ilaha illa Anta, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika mastata'tu, a'udhu bika min sharri ma sana'tu, abu'u laka bi ni'matika 'alayya, wa abu'u bi dhanbi, faghfir li fa innahu la yaghfirudh-dhunuba illa Anta.",
    translation:
      "O Allah, You are my Lord, none has the right to be worshipped except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil I have done. I acknowledge Your favour upon me, and I acknowledge my sin, so forgive me, for verily none can forgive sins except You.",
    reference: "Sahih al-Bukhari 6306",
    count: 1,
  },
  {
    id: "e_afiyah",
    arabic:
      "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0625\u0650\u0646\u064e\u0651\u064a \u0623\u064e\u0633\u0652\u0623\u064e\u0644\u064f\u0643\u064e \u0627\u0644\u0652\u0639\u064e\u0627\u0641\u0650\u064a\u064e\u0629\u064e \u0641\u0650\u064a \u0627\u0644\u062f\u064f\u0651\u0646\u0652\u064a\u064e\u0627 \u0648\u064e\u0627\u0644\u0652\u0622\u062e\u0650\u0631\u064e\u0629\u0650\u060c \u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0625\u0650\u0646\u064e\u0651\u064a \u0623\u064e\u0633\u0652\u0623\u064e\u0644\u064f\u0643\u064e \u0627\u0644\u0652\u0639\u064e\u0641\u0652\u0648\u064e \u0648\u064e\u0627\u0644\u0652\u0639\u064e\u0627\u0641\u0650\u064a\u064e\u0629\u064e \u0641\u0650\u064a \u062f\u0650\u064a\u0646\u0650\u064a \u0648\u064e\u062f\u064f\u0646\u0652\u064a\u064e\u0627\u064a\u064e \u0648\u064e\u0623\u064e\u0647\u0652\u0644\u0650\u064a \u0648\u064e\u0645\u064e\u0627\u0644\u0650\u064a\u060c \u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0627\u0633\u0652\u062a\u064f\u0631\u0652 \u0639\u064e\u0648\u0652\u0631\u064e\u0627\u062a\u0650\u064a \u0648\u064e\u0622\u0645\u0650\u0646\u0652 \u0631\u064e\u0648\u0652\u0639\u064e\u0627\u062a\u0650\u064a",
    transliteration:
      "Allahumma inni as'alukal-'afiyata fid-dunya wal-akhirah. Allahumma inni as'alukal-'afwa wal-'afiyata fi dini wa dunyaya wa ahli wa mali. Allahum-mastur 'awrati wa amin raw'ati.",
    translation:
      "O Allah, I ask You for well-being in this world and the Hereafter. O Allah, I ask You for pardon and well-being in my religious and worldly affairs, and my family and my wealth. O Allah, veil my weaknesses and set at ease my dismay.",
    reference: "Sunan Abu Dawud 5074",
    count: 1,
  },
  {
    id: "e_subhanallahi_bihamdihi",
    arabic:
      "\u0633\u064f\u0628\u0652\u062d\u064e\u0627\u0646\u064e \u0627\u0644\u0644\u064e\u0651\u0647\u0650 \u0648\u064e\u0628\u0650\u062d\u064e\u0645\u0652\u062f\u0650\u0647\u0650",
    transliteration: "Subhanallahi wa bihamdihi",
    translation:
      "Glory and praise be to Allah. Whoever says this one hundred times a day will have his sins forgiven even if they were as much as the foam of the sea.",
    reference: "Sahih al-Bukhari 6405",
    count: 100,
  },
  {
    id: "e_la_ilaha_illallah",
    arabic:
      "\u0644\u064e\u0627 \u0625\u0650\u0644\u064e\u0670\u0647\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0627\u0644\u0644\u064e\u0651\u0647\u064f \u0648\u064e\u062d\u0652\u062f\u064e\u0647\u064f \u0644\u064e\u0627 \u0634\u064e\u0631\u0650\u064a\u0643\u064e \u0644\u064e\u0647\u064f\u060c \u0644\u064e\u0647\u064f \u0627\u0644\u0652\u0645\u064f\u0644\u0652\u0643\u064f \u0648\u064e\u0644\u064e\u0647\u064f \u0627\u0644\u0652\u062d\u064e\u0645\u0652\u062f\u064f\u060c \u0648\u064e\u0647\u064f\u0648\u064e \u0639\u064e\u0644\u064e\u0649\u0670 \u0643\u064f\u0644\u064e\u0651 \u0634\u064e\u064a\u0652\u0621\u064d \u0642\u064e\u062f\u0650\u064a\u0631\u064c",
    transliteration:
      "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in Qadir.",
    translation:
      "None has the right to be worshipped except Allah, alone, without partner. To Him belongs all sovereignty and praise, and He is over all things omnipotent.",
    reference: "Sahih al-Bukhari 3293",
    count: 10,
  },
  {
    id: "e_subhanallahi_azeem",
    arabic:
      "\u0633\u064f\u0628\u0652\u062d\u064e\u0627\u0646\u064e \u0627\u0644\u0644\u064e\u0651\u0647\u0650 \u0648\u064e\u0628\u0650\u062d\u064e\u0645\u0652\u062f\u0650\u0647\u0650\u060c \u0633\u064f\u0628\u0652\u062d\u064e\u0627\u0646\u064e \u0627\u0644\u0644\u064e\u0651\u0647\u0650 \u0627\u0644\u0652\u0639\u064e\u0638\u0650\u064a\u0645\u0650",
    transliteration: "Subhanallahi wa bihamdihi, Subhanallahil-'Adheem.",
    translation:
      "Glory and praise be to Allah. Glory be to Allah, the Supreme. Two words which are light on the tongue, heavy on the Scale, and beloved to the Most Merciful.",
    reference: "Sahih al-Bukhari 6406",
    count: 3,
  },
  {
    id: "e_la_hawla",
    arabic:
      "\u0644\u064e\u0627 \u062d\u064e\u0648\u0652\u0644\u064e \u0648\u064e\u0644\u064e\u0627 \u0642\u064f\u0648\u064e\u0651\u0629\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0628\u0650\u0627\u0644\u0644\u064e\u0651\u0647\u0650",
    transliteration: "La hawla wa la quwwata illa billah.",
    translation:
      "There is no might nor power except with Allah. It is a treasure from the treasures of Paradise.",
    reference: "Sahih al-Bukhari 6384",
    count: 10,
  },
  {
    id: "e_astaghfirullah",
    arabic:
      "\u0623\u064e\u0633\u0652\u062a\u064e\u063a\u0652\u0641\u0650\u0631\u064f \u0627\u0644\u0644\u064e\u0651\u0647\u064e",
    transliteration: "Astaghfirullah.",
    translation: "I seek forgiveness from Allah.",
    reference: "Sahih Muslim 591",
    count: 3,
  },
  {
    id: "e_hasbiyallah",
    arabic:
      "\u062d\u064e\u0633\u0652\u0628\u0650\u064a\u064e \u0627\u0644\u0644\u064e\u0651\u0647\u064f \u0644\u064e\u0627 \u0625\u0650\u0644\u064e\u0670\u0647\u064e \u0625\u0650\u0644\u064e\u0651\u0627 \u0647\u064f\u0648\u064e\u060c \u0639\u064e\u0644\u064e\u064a\u0652\u0647\u0650 \u062a\u064e\u0648\u064e\u0643\u064e\u0651\u0644\u0652\u062a\u064f \u0648\u064e\u0647\u064f\u0648\u064e \u0631\u064e\u0628\u064f\u0651 \u0627\u0644\u0652\u0639\u064e\u0631\u0652\u0634\u0650 \u0627\u0644\u0652\u0639\u064e\u0638\u0650\u064a\u0645\u0650",
    transliteration:
      "Hasbiyallahu la ilaha illa Huwa, 'alayhi tawakkaltu wa Huwa Rabbul-'Arshil-'Adheem.",
    translation:
      "Allah is sufficient for me. There is no deity except Him. Upon Him I have relied, and He is the Lord of the Great Throne.",
    reference: "Sunan Abu Dawud 5081",
    count: 7,
  },
  {
    id: "e_salli_ala_muhammad",
    arabic:
      "\u0627\u0644\u0644\u064e\u0651\u0647\u064f\u0645\u064e\u0651 \u0635\u064e\u0644\u064e\u0651 \u0648\u064e\u0633\u064e\u0644\u064e\u0651\u0645\u0652 \u0639\u064e\u0644\u064e\u0649\u0670 \u0646\u064e\u0628\u0650\u064a\u064e\u0651\u0646\u064e\u0627 \u0645\u064f\u062d\u064e\u0645\u064e\u0651\u062f\u064d",
    transliteration: "Allahumma salli wa sallim 'ala nabiyyina Muhammad.",
    translation: "O Allah, send prayers and peace upon our Prophet Muhammad.",
    reference: "Quran 33:56",
    count: 1,
  },
];

function getTodayKey(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = (today.getMonth() + 1).toString().padStart(2, "0");
  const d = today.getDate().toString().padStart(2, "0");
  return `adhkar_progress_${y}-${m}-${d}`;
}

export default function AdhkarScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const requestedInitialTab = String(route.params?.initialTab || "morning");
  const initialAdhkarTab: "morning" | "evening" =
    requestedInitialTab === "evening" ? "evening" : "morning";
  const [activeTab, setActiveTab] = useState<"morning" | "evening">(
    initialAdhkarTab,
  );
  const [morningCounts, setMorningCounts] = useState<AdhkarState>({});
  const [eveningCounts, setEveningCounts] = useState<AdhkarState>({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const adhkarList = activeTab === "morning" ? MORNING_ADHKAR : EVENING_ADHKAR;
  const counts = activeTab === "morning" ? morningCounts : eveningCounts;
  const setCounts =
    activeTab === "morning" ? setMorningCounts : setEveningCounts;

  const completedCount = adhkarList.filter((a) =>
    completedIds.has(a.id),
  ).length;
  const totalCount = adhkarList.length;
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const raw = await AsyncStorage.getItem(getTodayKey());
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.morningCounts) setMorningCounts(parsed.morningCounts);
          if (parsed.eveningCounts) setEveningCounts(parsed.eveningCounts);
          if (parsed.completedIds)
            setCompletedIds(new Set(parsed.completedIds));
        }
      } catch {}
    };
    loadProgress();
  }, []);

  const saveProgress = useCallback(
    (mCounts: AdhkarState, eCounts: AdhkarState, completed: Set<string>) => {
      const morningCompleted = MORNING_ADHKAR.filter((a) =>
        completed.has(a.id),
      ).length;
      const eveningCompleted = EVENING_ADHKAR.filter((a) =>
        completed.has(a.id),
      ).length;
      const data = {
        morning: { completed: morningCompleted, total: MORNING_ADHKAR.length },
        evening: { completed: eveningCompleted, total: EVENING_ADHKAR.length },
        morningCounts: mCounts,
        eveningCounts: eCounts,
        completedIds: Array.from(completed),
      };
      syncedSetItem(getTodayKey(), JSON.stringify(data));
    },
    [],
  );

  const handleTap = useCallback(
    (item: AdhkarItem) => {
      if (completedIds.has(item.id)) return;

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const currentCount = (counts[item.id] || 0) + 1;
      let newCounts: AdhkarState;
      let newCompleted = new Set(completedIds);

      if (currentCount >= item.count) {
        newCounts = { ...counts, [item.id]: item.count };
        newCompleted.add(item.id);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        newCounts = { ...counts, [item.id]: currentCount };
      }

      setCounts(newCounts);
      if (newCompleted.size !== completedIds.size) {
        setCompletedIds(newCompleted);
      }

      const mC = activeTab === "morning" ? newCounts : morningCounts;
      const eC = activeTab === "evening" ? newCounts : eveningCounts;
      saveProgress(mC, eC, newCompleted);
    },
    [
      counts,
      setCounts,
      completedIds,
      activeTab,
      morningCounts,
      eveningCounts,
      saveProgress,
    ],
  );

  const handleReset = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    const newMorning: AdhkarState = {};
    const newEvening: AdhkarState = {};
    const newCompleted = new Set<string>();
    setMorningCounts(newMorning);
    setEveningCounts(newEvening);
    setCompletedIds(newCompleted);
    saveProgress(newMorning, newEvening, newCompleted);
  }, [saveProgress]);

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
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h4">
          {activeTab === "morning" ? "Morning Adhkar" : "Evening Adhkar"}
        </ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={handleReset}
          hitSlop={8}
          testID="button-reset"
        >
          <AppIcon name="rotate-ccw" size={20} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(300)}>
          <View
            style={[
              styles.tabContainer,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <Pressable
              style={[
                styles.tabButton,
                activeTab === "morning" && styles.tabButtonActive,
                activeTab === "morning" && { backgroundColor: theme.primary },
              ]}
              onPress={() => setActiveTab("morning")}
              testID="tab-morning"
            >
              <AppIcon
                name="sunrise"
                size={16}
                color={
                  activeTab === "morning" ? "#FFFFFF" : theme.textSecondary
                }
              />
              <ThemedText
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "morning" ? "#FFFFFF" : theme.textSecondary,
                  },
                ]}
              >
                Morning
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.tabButton,
                activeTab === "evening" && styles.tabButtonActive,
                activeTab === "evening" && { backgroundColor: theme.primary },
              ]}
              onPress={() => setActiveTab("evening")}
              testID="tab-evening"
            >
              <AppIcon
                name="sunset"
                size={16}
                color={
                  activeTab === "evening" ? "#FFFFFF" : theme.textSecondary
                }
              />
              <ThemedText
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "evening" ? "#FFFFFF" : theme.textSecondary,
                  },
                ]}
              >
                Evening
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(300)}>
          <View
            style={[
              styles.progressCard,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <GeometricCardPattern color={theme.primary} opacity={0.012} />
            <View style={styles.progressHeader}>
              <View style={styles.progressTitleWrap}>
                <TasbeehIconSvg
                  size={22}
                  color={theme.primary}
                  accentColor={theme.scholar}
                />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {completedCount} of {totalCount} completed
                </ThemedText>
              </View>
              <ThemedText
                type="caption"
                style={{ color: theme.primary, fontWeight: "600" }}
              >
                {Math.round(progressPct * 100)}%
              </ThemedText>
            </View>
            <View
              style={[
                styles.progressBarTrack,
                { backgroundColor: `${theme.textMuted}20` },
              ]}
            >
              <LinearGradient
                colors={[theme.primary, theme.gradientStart]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(progressPct * 100)}%` as any },
                ]}
              />
            </View>
          </View>
        </Animated.View>

        {adhkarList.map((item, index) => {
          const current = counts[item.id] || 0;
          const isCompleted = completedIds.has(item.id);
          const inProgress = current > 0 && !isCompleted;

          return (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(120 + index * 50).duration(300)}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.adhkarCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: isCompleted
                      ? theme.primaryBorder
                      : theme.borderSubtle,
                  },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => handleTap(item)}
                testID={`card-adhkar-${item.id}`}
              >
                {isCompleted ? (
                  <View style={styles.completedOverlay}>
                    <AppIcon
                      name="check-circle"
                      size={20}
                      color={theme.primary}
                    />
                  </View>
                ) : null}

                <ThemedText style={[styles.arabicText, { color: theme.text }]}>
                  {item.arabic}
                </ThemedText>
                <GoldDivider
                  color={isCompleted ? theme.primary : theme.scholar}
                  opacity={isCompleted ? 0.5 : 0.28}
                  style={styles.adhkarGoldDivider}
                />

                <ThemedText
                  type="small"
                  style={[styles.translitText, { color: theme.textMuted }]}
                >
                  {item.transliteration}
                </ThemedText>

                <ThemedText
                  type="body"
                  style={{
                    color: theme.textSecondary,
                    lineHeight: 22,
                    fontSize: 14,
                  }}
                >
                  {item.translation}
                </ThemedText>

                <View style={styles.cardFooter}>
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
                      {item.reference}
                    </ThemedText>
                  </View>

                  <Pressable
                    style={[
                      styles.counterCircle,
                      {
                        backgroundColor: isCompleted
                          ? theme.primary
                          : inProgress
                            ? theme.primaryMuted
                            : `${theme.textMuted}15`,
                        borderColor: isCompleted
                          ? theme.primary
                          : inProgress
                            ? theme.primary
                            : `${theme.textMuted}30`,
                      },
                    ]}
                    onPress={() => handleTap(item)}
                    testID={`counter-${item.id}`}
                  >
                    {isCompleted ? (
                      <AppIcon name="check" size={22} color="#FFFFFF" />
                    ) : (
                      <View style={styles.counterContent}>
                        <ThemedText
                          style={[
                            styles.counterText,
                            {
                              color: inProgress
                                ? theme.primary
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {current}
                        </ThemedText>
                        <View
                          style={[
                            styles.counterDivider,
                            {
                              backgroundColor: inProgress
                                ? theme.primaryBorder
                                : `${theme.textMuted}30`,
                            },
                          ]}
                        />
                        <ThemedText
                          style={[
                            styles.counterTotal,
                            {
                              color: inProgress
                                ? theme.primary
                                : theme.textMuted,
                            },
                          ]}
                        >
                          {item.count}
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
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
  tabContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    gap: 6,
  },
  tabButtonActive: {
    borderRadius: BorderRadius.lg,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  progressTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  adhkarCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  completedOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
  },
  arabicText: {
    fontSize: 22,
    textAlign: "right",
    lineHeight: 38,
    fontWeight: "400",
  },
  adhkarGoldDivider: {
    marginTop: -Spacing.xs,
    marginBottom: Spacing.xs,
  },
  translitText: {
    fontStyle: "italic",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  refBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 20,
  },
  counterCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  counterContent: {
    alignItems: "center",
  },
  counterText: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
  counterDivider: {
    width: 20,
    height: 1,
    marginVertical: 1,
  },
  counterTotal: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 13,
  },
});
