import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
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

const ERA_COLORS = [
  "emerald",
  "blue",
  "amber",
  "purple",
  "teal",
  "rose",
  "indigo",
  "green",
  "orange",
  "violet",
  "pink",
  "yellow",
] as const;

const PROPHETS = [
  {
    id: 1,
    name: "Adam",
    arabic: "\u0622\u062F\u0645",
    era: "The Beginning",
    brief: "First human, created from clay by Allah and placed in Paradise.",
    story:
      "Prophet Adam (peace be upon him) was the first human being and the first prophet. Allah created him from clay and breathed life into him. He was taught the names of all things and was placed in Paradise with his wife Hawwa (Eve). After being deceived by Shaytan into eating from the forbidden tree, they were sent to Earth. Adam repented sincerely and Allah accepted his repentance, making him the first prophet to guide humanity.",
  },
  {
    id: 2,
    name: "Idris",
    arabic: "\u0625\u062F\u0631\u064A\u0633",
    era: "Early Prophets",
    brief: "Known for his great wisdom, patience, and devotion to knowledge.",
    story:
      "Prophet Idris (peace be upon him) is believed to be among the earliest prophets after Adam. He was known for his extraordinary wisdom, patience, and devotion to seeking knowledge. He is credited with being the first to write with a pen and the first to sew garments. Allah raised him to a high station as mentioned in the Quran: 'And We raised him to a high station' (Quran 19:57).",
  },
  {
    id: 3,
    name: "Nuh (Noah)",
    arabic: "\u0646\u0648\u062D",
    era: "Early Prophets",
    brief: "Built the ark and survived the great flood sent by Allah.",
    story:
      "Prophet Nuh (peace be upon him) preached to his people for 950 years, calling them to worship Allah alone. Despite his persistent efforts, only a few believed. Allah commanded him to build a great ark, and when the flood came, Nuh, his family (except his disbelieving son), and pairs of every animal were saved. The flood destroyed the disbelievers, and Nuh's ark came to rest on Mount Judi. He is known as one of the five greatest prophets (Ulul Azm).",
  },
  {
    id: 4,
    name: "Hud",
    arabic: "\u0647\u0648\u062F",
    era: "Ancient Arabia",
    brief: "Sent to the people of 'Ad who were known for their great strength.",
    story:
      "Prophet Hud (peace be upon him) was sent to the people of 'Ad, an ancient Arabian tribe known for their impressive physical strength and grand architecture. They had turned to idol worship and were arrogant. Hud called them to worship Allah alone, but they rejected him. As punishment, Allah sent a devastating wind that destroyed the people of 'Ad, sparing only Hud and his followers.",
  },
  {
    id: 5,
    name: "Salih",
    arabic: "\u0635\u0627\u0644\u062D",
    era: "Ancient Arabia",
    brief: "Sent to the people of Thamud with the miracle of the she-camel.",
    story:
      "Prophet Salih (peace be upon him) was sent to the people of Thamud, who carved magnificent dwellings into mountains. They demanded a miracle, so Allah brought forth a miraculous she-camel from a rock. Salih warned them not to harm it, but they hamstrung and killed the camel. As a result, Allah destroyed the people of Thamud with a mighty earthquake and thunderous blast.",
  },
  {
    id: 6,
    name: "Ibrahim (Abraham)",
    arabic: "\u0625\u0628\u0631\u0627\u0647\u064A\u0645",
    era: "Patriarch Era",
    brief: "Father of prophets, friend of Allah, and builder of the Kaaba.",
    story:
      "Prophet Ibrahim (peace be upon him) is one of the greatest prophets and is called Khalilullah (Friend of Allah). From a young age, he rejected idol worship and was thrown into a fire by his people, but Allah made the fire cool and peaceful for him. He migrated to various lands, was tested with the sacrifice of his son Ismail, and together they rebuilt the Kaaba in Makkah. He is the patriarch of both the Jewish and Arab prophetic lines through his sons Ishaq and Ismail.",
  },
  {
    id: 7,
    name: "Lut (Lot)",
    arabic: "\u0644\u0648\u0637",
    era: "Patriarch Era",
    brief: "Nephew of Ibrahim, warned the people of Sodom against immorality.",
    story:
      "Prophet Lut (peace be upon him) was the nephew of Prophet Ibrahim. He was sent to the people of Sodom and Gomorrah, who engaged in great immorality and wickedness. Despite his persistent warnings and calls to righteousness, they refused to change their ways and even threatened to expel him. Allah sent angels in the form of handsome men as a test, and when the people tried to harm them, Allah destroyed the cities by turning them upside down and raining stones upon them.",
  },
  {
    id: 8,
    name: "Ismail (Ishmael)",
    arabic: "\u0625\u0633\u0645\u0627\u0639\u064A\u0644",
    era: "Patriarch Era",
    brief: "Son of Ibrahim, willingly submitted to be sacrificed for Allah.",
    story:
      "Prophet Ismail (peace be upon him) was the firstborn son of Ibrahim through Hajar (Hagar). As an infant, he was left with his mother in the barren desert of Makkah by Allah's command. The miracle of Zamzam water sprang forth to save them. When Ibrahim was commanded in a dream to sacrifice his son, young Ismail willingly submitted to Allah's will. Allah replaced him with a ram, and this event is commemorated annually during Eid al-Adha. He helped his father rebuild the Kaaba.",
  },
  {
    id: 9,
    name: "Ishaq (Isaac)",
    arabic: "\u0625\u0633\u062D\u0627\u0642",
    era: "Patriarch Era",
    brief: "Son of Ibrahim and Sarah, born miraculously in their old age.",
    story:
      "Prophet Ishaq (peace be upon him) was the second son of Prophet Ibrahim, born to his wife Sarah in their old age. His birth was a miracle and glad tidings from Allah, announced by angels who visited Ibrahim. He continued the prophetic mission in the land of Canaan and was the father of Prophet Yaqub. Through his lineage, many of the later prophets of Bani Israel (Children of Israel) would come.",
  },
  {
    id: 10,
    name: "Yaqub (Jacob)",
    arabic: "\u064A\u0639\u0642\u0648\u0628",
    era: "Patriarch Era",
    brief: "Father of the twelve tribes of Israel, patient through trials.",
    story:
      "Prophet Yaqub (peace be upon him), also known as Israel, was the son of Prophet Ishaq. He had twelve sons who became the ancestors of the twelve tribes of Israel. His most beloved son was Yusuf, whose brothers became jealous and plotted against him. Yaqub endured the loss of Yusuf with beautiful patience (sabr jameel) for many years, crying until he lost his sight. Allah eventually reunited him with Yusuf in Egypt and restored his vision.",
  },
  {
    id: 11,
    name: "Yusuf (Joseph)",
    arabic: "\u064A\u0648\u0633\u0641",
    era: "Egypt Era",
    brief: "Sold into slavery, interpreter of dreams, became ruler of Egypt.",
    story:
      "Prophet Yusuf (peace be upon him) had one of the most detailed stories in the Quran, described as 'the best of stories.' As a child, he dreamed of eleven stars, the sun, and moon prostrating to him. His jealous brothers threw him into a well, and he was sold into slavery in Egypt. He was falsely accused and imprisoned, but his ability to interpret dreams led to his release. He interpreted the king's dream about seven years of plenty and famine, and was appointed as treasurer of Egypt. He eventually reunited with his family and forgave his brothers.",
  },
  {
    id: 12,
    name: "Ayyub (Job)",
    arabic: "\u0623\u064A\u0648\u0628",
    era: "Prophets of Patience",
    brief:
      "Known for his extraordinary patience through severe trials and suffering.",
    story:
      "Prophet Ayyub (peace be upon him) was a wealthy and righteous man who was tested with the loss of his wealth, children, and health. He suffered from a severe illness that lasted for many years, yet he never complained to anyone but Allah. His patience became legendary, and he is often cited as the ultimate example of sabr (patience). When he finally called upon Allah saying 'Indeed, adversity has touched me, and You are the Most Merciful of the merciful,' Allah healed him and restored his blessings manifold.",
  },
  {
    id: 13,
    name: "Shu'ayb",
    arabic: "\u0634\u0639\u064A\u0628",
    era: "Ancient Arabia",
    brief:
      "Sent to the people of Madyan to correct their dishonest trade practices.",
    story:
      "Prophet Shu'ayb (peace be upon him) was sent to the people of Madyan (Midian), who were known for cheating in their business dealings and giving short measure. He called them to worship Allah alone and to be honest in their transactions. He is known as 'Khatib al-Anbiya' (the Orator of the Prophets) for his eloquent speech. When they rejected his message, Allah destroyed them with an earthquake and a scorching heat that came upon them like a cloud.",
  },
  {
    id: 14,
    name: "Musa (Moses)",
    arabic: "\u0645\u0648\u0633\u0649",
    era: "Egypt Era",
    brief: "Led the Exodus from Egypt, received the Torah, parted the Red Sea.",
    story:
      "Prophet Musa (peace be upon him) is the most frequently mentioned prophet in the Quran. Born during Pharaoh's persecution of the Israelites, he was placed in a basket on the Nile and raised in Pharaoh's palace by Allah's design. After accidentally killing a man, he fled to Madyan where he married and lived as a shepherd. Allah spoke to him at Mount Tur and gave him miracles including his staff and glowing hand. He confronted Pharaoh, led the Israelites out of Egypt through the parted Red Sea, and received the Torah on Mount Sinai. He is one of the five greatest prophets (Ulul Azm).",
  },
  {
    id: 15,
    name: "Harun (Aaron)",
    arabic: "\u0647\u0627\u0631\u0648\u0646",
    era: "Egypt Era",
    brief: "Brother and devoted helper of Prophet Musa, eloquent speaker.",
    story:
      "Prophet Harun (peace be upon him) was the elder brother of Prophet Musa. He was appointed as a prophet at Musa's request to Allah, as Harun was more eloquent in speech. He assisted Musa in delivering the message to Pharaoh and the Children of Israel. When Musa went to Mount Sinai for forty days, Harun was left in charge. During this time, some Israelites began worshipping the golden calf, and Harun tried to prevent them but was overwhelmed. He was known for his gentle nature and love of peace.",
  },
  {
    id: 16,
    name: "Dhul-Kifl",
    arabic: "\u0630\u0648 \u0627\u0644\u0643\u0641\u0644",
    era: "Prophets of Patience",
    brief: "Known for his patience, gratitude, and fulfillment of his pledge.",
    story:
      "Prophet Dhul-Kifl (peace be upon him) is mentioned twice in the Quran among the righteous and patient. His name means 'the one with a pledge' or 'the one who fulfilled his responsibility.' Some scholars identify him with the Biblical prophet Ezekiel. He is praised in the Quran for being among the patient and among the righteous. He took on the responsibility of leading his people with justice, never showing anger, and always fulfilling his duties to Allah and his people.",
  },
  {
    id: 17,
    name: "Dawud (David)",
    arabic: "\u062F\u0627\u0648\u062F",
    era: "Kingdom Era",
    brief: "Given the Psalms (Zabur), defeated Goliath, just ruler.",
    story:
      "Prophet Dawud (peace be upon him) was both a prophet and a king of Israel. As a young man, he defeated the giant warrior Jalut (Goliath) with a slingshot during a battle between the Israelites and the Philistines. Allah gave him the Zabur (Psalms) and blessed him with a beautiful voice that caused the mountains and birds to glorify Allah with him. He was known for his justice and would fast every other day. Allah taught him to make coats of mail from iron. He is the father of Prophet Sulayman.",
  },
  {
    id: 18,
    name: "Sulayman (Solomon)",
    arabic: "\u0633\u0644\u064A\u0645\u0627\u0646",
    era: "Kingdom Era",
    brief: "Blessed with wisdom, command over jinn, animals, and the wind.",
    story:
      "Prophet Sulayman (peace be upon him) was the son of Prophet Dawud and inherited his kingdom. Allah granted him extraordinary gifts: he could understand the language of birds and animals, command the jinn and the wind, and had vast armies of men, jinn, and birds. He built a magnificent palace and the great temple. The story of his encounter with the Queen of Sheba (Bilqis) is famous. Despite all his power and wealth, he remained humble and devoted to Allah. He prayed for a kingdom that no one after him would have.",
  },
  {
    id: 19,
    name: "Ilyas (Elijah)",
    arabic: "\u0625\u0644\u064A\u0627\u0633",
    era: "Later Prophets",
    brief: "Called the people of Baalbek to abandon idol worship.",
    story:
      "Prophet Ilyas (peace be upon him) was sent to the people of Baalbek in modern-day Lebanon. His people had begun worshipping an idol called Ba'l while abandoning the worship of Allah. Ilyas courageously confronted them, calling them to return to the worship of the One True God. The Quran praises him: 'And indeed, Ilyas was among the messengers. Peace be upon Ilyas. Indeed, We thus reward the doers of good. Indeed, he was of Our believing servants' (Quran 37:123-132).",
  },
  {
    id: 20,
    name: "Al-Yasa (Elisha)",
    arabic: "\u0627\u0644\u064A\u0633\u0639",
    era: "Later Prophets",
    brief:
      "Successor of Prophet Ilyas, continued calling people to monotheism.",
    story:
      "Prophet Al-Yasa (peace be upon him) was the successor and student of Prophet Ilyas. He continued the mission of calling people to worship Allah alone after Ilyas. The Quran mentions him among the righteous: 'And Ismail and Al-Yasa and Yunus and Lut, and all of them We preferred over the worlds' (Quran 6:86). He is praised for being among the best of people and among the chosen ones of Allah.",
  },
  {
    id: 21,
    name: "Yunus (Jonah)",
    arabic: "\u064A\u0648\u0646\u0633",
    era: "Later Prophets",
    brief: "Swallowed by a great whale, his repentance became a model for all.",
    story:
      "Prophet Yunus (peace be upon him) was sent to the people of Nineveh. When they rejected his message, he left the city in anger without Allah's permission. He boarded a ship that encountered a terrible storm, and was thrown overboard and swallowed by a great whale. Inside the whale's belly, he called out to Allah with the famous dua: 'La ilaha illa Anta, Subhanaka, inni kuntu min adh-dhalimin' (There is no god but You, Glory to You, indeed I was among the wrongdoers). Allah accepted his repentance and commanded the whale to release him. His people ultimately believed and were saved from punishment.",
  },
  {
    id: 22,
    name: "Zakariya (Zechariah)",
    arabic: "\u0632\u0643\u0631\u064A\u0627",
    era: "Pre-Islamic Era",
    brief: "Father of Yahya, his prayer for a child was answered in old age.",
    story:
      "Prophet Zakariya (peace be upon him) was a righteous prophet and the guardian of Maryam (Mary), the mother of Isa. When he saw that Allah provided Maryam with food miraculously, he was inspired to pray for a child despite his old age and his wife's barrenness. Allah answered his prayer and gave him glad tidings of a son named Yahya. He was told as a sign that he would not speak to people for three days except through gestures. He devoted his life to serving Allah in the temple.",
  },
  {
    id: 23,
    name: "Yahya (John)",
    arabic: "\u064A\u062D\u064A\u0649",
    era: "Pre-Islamic Era",
    brief: "Given wisdom as a youth, confirmed the word of Allah.",
    story:
      "Prophet Yahya (peace be upon him) was the son of Prophet Zakariya, born miraculously to elderly parents. Allah gave him wisdom even as a child and he was commanded to hold firmly to the Scripture. The Quran describes him as noble, chaste, and a prophet from among the righteous. He was compassionate towards his parents and was never arrogant or disobedient. He confirmed the coming of Prophet Isa and called people to righteousness. He was known for his ascetic lifestyle and deep devotion to Allah.",
  },
  {
    id: 24,
    name: "Isa (Jesus)",
    arabic: "\u0639\u064A\u0633\u0649",
    era: "Pre-Islamic Era",
    brief:
      "Born miraculously to Maryam, given the Gospel, performed many miracles.",
    story:
      "Prophet Isa (peace be upon him) was born miraculously to Maryam (Mary) without a father, by the command of Allah. He spoke from the cradle defending his mother's honor. Allah gave him the Injeel (Gospel) and granted him many miracles: healing the blind and lepers, giving life to the dead by Allah's permission, and creating a bird from clay. He is one of the five greatest prophets (Ulul Azm). He was not crucified; rather, Allah raised him to the heavens. Muslims believe he will return before the Day of Judgment.",
  },
  {
    id: 25,
    name: "Muhammad",
    arabic: "\u0645\u062D\u0645\u062F",
    era: "Final Era",
    brief:
      "The Final Prophet, Seal of Prophets, given the Quran as the final revelation.",
    story:
      "Prophet Muhammad (peace be upon him) is the final messenger of Allah, sent as a mercy to all of mankind. Born in Makkah in 570 CE, he received the first revelation at age 40 in the Cave of Hira. He endured persecution, migrated to Madinah, and established the first Islamic community. He received the Quran over 23 years, performed the miraculous Night Journey (Isra and Mi'raj), conquered Makkah peacefully, and delivered his farewell sermon at Arafat. He passed away in 632 CE in Madinah. He is the Seal of the Prophets, and his message completes the religion of Islam for all humanity.",
  },
];

function getEraColor(index: number) {
  return ERA_COLORS[index % ERA_COLORS.length];
}

export default function ProphetsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderProphet = ({
    item,
    index,
  }: {
    item: (typeof PROPHETS)[0];
    index: number;
  }) => {
    const isExpanded = expandedId === item.id;
    const colorKey = getEraColor(index);
    const color = isDark
      ? CategoryColors[colorKey].dark
      : CategoryColors[colorKey];

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
          testID={`prophet-card-${item.id}`}
        >
          <GeometricCardPattern color={theme.scholar} opacity={0.012} />
          <View style={styles.cardHeader}>
            <View style={[styles.numberBadge, { backgroundColor: color.bg }]}>
              <ThemedText
                style={[styles.numberText, { color: color.text }]}
                type="caption"
              >
                {item.id}
              </ThemedText>
            </View>
            <View style={styles.cardHeaderText}>
              <View style={styles.nameRow}>
                <ThemedText type="h4" style={styles.prophetName}>
                  {item.name}
                </ThemedText>
                <ThemedText
                  type="body"
                  style={[styles.arabicName, { color: theme.primary }]}
                >
                  {item.arabic}
                </ThemedText>
              </View>
              <View style={[styles.eraBadge, { backgroundColor: color.bg }]}>
                <ThemedText type="caption" style={{ color: color.text }}>
                  {item.era}
                </ThemedText>
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
            style={[styles.briefText, { color: theme.textSecondary }]}
          >
            {item.brief}
          </ThemedText>
          <GoldDivider
            color={theme.scholar}
            opacity={0.22}
            style={styles.cardDivider}
          />
          {isExpanded ? (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={[
                styles.storyContainer,
                {
                  backgroundColor: isDark
                    ? theme.backgroundSecondary
                    : theme.surfaceElevated,
                },
              ]}
            >
              <ThemedText type="small" style={styles.storyText}>
                {item.story}
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
          style={styles.backButton}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <CrescentMark
            size={24}
            color={theme.scholar}
            accentColor={theme.primary}
            opacity={0.92}
          />
          <ThemedText type="h3" style={styles.headerTitle}>
            Stories of the Prophets
          </ThemedText>
        </View>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={PROPHETS}
        renderItem={renderProphet}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        testID="prophets-list"
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
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    textAlign: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
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
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  numberText: {
    fontWeight: "700",
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
  },
  prophetName: {
    flexShrink: 1,
  },
  arabicName: {
    fontSize: 18,
    fontWeight: "600",
  },
  eraBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.xs,
  },
  briefText: {
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  cardDivider: {
    marginTop: Spacing.sm,
  },
  storyContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  storyText: {
    lineHeight: 22,
  },
});
