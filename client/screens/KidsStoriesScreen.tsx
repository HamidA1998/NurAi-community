import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  CategoryColors,
  Fonts,
} from "@/constants/theme";
import { useKidsMode } from "@/context/KidsModeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { FREE_STORIES_COUNT } from "@/config/entitlements";
import { PremiumBadge } from "@/components/PremiumGate";
import {
  GeometricCardPattern,
  GoldDivider,
  IslamicPatternBackground,
  QuranIconSvg,
} from "@/components/premium/svg/PremiumSvgs";
import { AppIcon } from "@/components/icons";

type StoryCategory = "Prophets" | "Sahabah" | "Manners" | "Animals" | "History";
type AgeRange = "3-5" | "6-9" | "10-13";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface Story {
  id: string;
  title: string;
  brief: string;
  content: string;
  category: StoryCategory;
  ageGroups: AgeRange[];
  readTime: number;
  moral: string;
  icon: string;
  quiz: QuizQuestion[];
}

const CATEGORY_COLORS: Record<StoryCategory, keyof typeof CategoryColors> = {
  Prophets: "blue",
  Sahabah: "emerald",
  Manners: "amber",
  Animals: "teal",
  History: "purple",
};

const CATEGORY_ICONS: Record<StoryCategory, string> = {
  Prophets: "book-open",
  Sahabah: "users",
  Manners: "heart",
  Animals: "feather",
  History: "clock",
};

const FILTER_CATEGORIES: ("All" | StoryCategory)[] = [
  "All",
  "Prophets",
  "Sahabah",
  "Manners",
  "Animals",
  "History",
];

const STORIES: Story[] = [
  {
    id: "prophet-adam",
    title: "Story of Prophet Adam (AS)",
    brief:
      "The First Human. Learn about how Allah created the very first human being and placed him in Jannah.",
    content:
      "Long ago, before there were any people on Earth, Allah decided to create a special being. Allah took clay from the earth and shaped it into a man. Then Allah breathed life into him, and this was Adam (AS), the very first human being.\n\nAllah taught Adam the names of everything — the animals, the plants, the stars, and all things in creation. Even the angels did not know these names! Allah then asked the angels to bow down to Adam out of respect, and they all did — except for Iblis (Shaytan), who was too proud.\n\nAllah placed Adam in a beautiful garden called Jannah, where he had everything he could ever want. Allah also created Hawwa (Eve) as a companion for Adam. They were told they could enjoy everything in Jannah, but there was one tree they must not go near.\n\nShaytan whispered to Adam and Hawwa and tricked them into eating from the forbidden tree. When they realized their mistake, they felt very sorry and asked Allah for forgiveness. Allah, the Most Merciful, forgave them but sent them down to Earth to live and be tested.\n\nAdam (AS) became the first prophet on Earth. He taught his children to worship only Allah and to be good. This is where the story of all humanity begins — with Prophet Adam (AS), the father of all people.",
    category: "Prophets",
    ageGroups: ["3-5", "6-9", "10-13"],
    readTime: 4,
    moral:
      "Always ask Allah for forgiveness when you make a mistake — He is the Most Merciful.",
    icon: "globe",
    quiz: [
      {
        question: "What was Prophet Adam (AS) created from?",
        options: ["Water", "Light", "Clay", "Fire"],
        correctIndex: 2,
      },
      {
        question: "Who refused to bow to Adam (AS)?",
        options: ["Jibreel", "Iblis", "Mikail", "Israfil"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "prophet-nuh",
    title: "Story of Prophet Nuh (AS)",
    brief:
      "The Great Flood. Discover how Prophet Nuh built a mighty ark to save the believers and animals.",
    content:
      "Prophet Nuh (AS) was sent by Allah to guide his people, who had begun to worship idols instead of Allah. For 950 years, Nuh (AS) patiently called his people to worship only Allah, but most of them refused to listen and made fun of him.\n\nAllah told Nuh (AS) to build a large ship — an ark — even though there was no sea nearby. The people laughed at him, asking why he was building a ship on dry land. But Nuh (AS) trusted Allah and kept building with the help of the few believers.\n\nWhen the ark was ready, Allah commanded Nuh (AS) to bring aboard a pair of every animal — male and female — and all the believers. Then the skies opened up with heavy rain, and water burst from the ground. The entire earth was flooded!\n\nThe ark floated safely on the massive waves while everything else was covered by water. Sadly, even Nuh's own son refused to come aboard and was lost in the flood. Nuh (AS) was heartbroken, but Allah reminded him that faith is more important than family ties.\n\nWhen the water finally went down, the ark rested on Mount Judi. Nuh (AS) and the believers thanked Allah and started life anew on Earth. This story teaches us about patience, trust in Allah, and the importance of listening to His message.",
    category: "Prophets",
    ageGroups: ["3-5", "6-9", "10-13"],
    readTime: 4,
    moral:
      "Trust in Allah even when others laugh at you — Allah always keeps His promise.",
    icon: "anchor",
    quiz: [
      {
        question: "How many years did Nuh (AS) call his people?",
        options: ["100 years", "500 years", "950 years", "200 years"],
        correctIndex: 2,
      },
      {
        question: "What did Nuh (AS) build?",
        options: ["A mosque", "A house", "An ark", "A palace"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "prophet-ibrahim",
    title: "Story of Prophet Ibrahim (AS)",
    brief:
      "The Friend of Allah. Learn how Ibrahim stood firm in his faith and was saved from the fire.",
    content:
      "Prophet Ibrahim (AS) grew up among people who worshipped idols made of stone and wood. Even as a young boy, Ibrahim knew these idols could not hear, see, or help anyone. He looked at the stars, the moon, and the sun, and realized that only the One who created all of these deserved to be worshipped — Allah.\n\nOne day, Ibrahim (AS) broke all the idols in the temple except the biggest one, to show the people how powerless their idols were. When the people found out, they were furious. They decided to punish Ibrahim by throwing him into a huge fire.\n\nBut Allah protected Ibrahim! Allah commanded the fire: 'O fire, be cool and safe for Ibrahim!' The fire did not burn him at all. Ibrahim walked out completely unharmed. This was a great miracle that showed Allah's power.\n\nLater in life, Allah tested Ibrahim with an even greater test. Allah asked him in a dream to sacrifice his beloved son, Ismail. Both father and son submitted to Allah's will, but just as Ibrahim was about to carry out the sacrifice, Allah replaced Ismail with a ram. This act of obedience is remembered every year during Eid al-Adha.\n\nIbrahim (AS) also rebuilt the Kaaba in Makkah with his son Ismail, making it a place of worship for all people. Because of his incredible faith and devotion, Allah honored Ibrahim with the special title 'Khalilullah' — the Friend of Allah.",
    category: "Prophets",
    ageGroups: ["6-9", "10-13"],
    readTime: 5,
    moral:
      "True faith means trusting Allah completely, even when the test is very difficult.",
    icon: "star",
    quiz: [
      {
        question: "What happened when Ibrahim was thrown into the fire?",
        options: [
          "He was burned",
          "He flew away",
          "The fire became cool and safe",
          "The fire went out",
        ],
        correctIndex: 2,
      },
      {
        question: "What title did Allah give Ibrahim (AS)?",
        options: [
          "The Wise",
          "The Friend of Allah",
          "The Strong",
          "The Patient",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "prophet-yusuf",
    title: "Story of Prophet Yusuf (AS)",
    brief:
      "The Most Beautiful Story. Follow the journey of Yusuf from a well to becoming a great leader.",
    content:
      "Prophet Yusuf (AS) was one of the twelve sons of Prophet Yaqub (AS). Allah blessed Yusuf with great beauty and the ability to interpret dreams. When Yusuf told his father about a dream where eleven stars, the sun, and the moon bowed to him, Yaqub (AS) knew his son was special but warned him not to tell his brothers.\n\nYusuf's brothers were jealous of him because their father loved him so much. They came up with a terrible plan — they threw Yusuf into a deep, dark well and told their father that a wolf had eaten him. But Allah was with Yusuf. A passing caravan found him and took him to Egypt, where he was sold as a servant.\n\nIn Egypt, Yusuf faced many hardships and was even put in prison for years, though he had done nothing wrong. In prison, he interpreted the dreams of two fellow prisoners, and his gift became known. Eventually, the King of Egypt had a troubling dream that no one could explain, and Yusuf was called to help.\n\nYusuf correctly interpreted the dream as a warning about seven years of plenty followed by seven years of famine. Impressed, the King appointed Yusuf to manage Egypt's food supply. Yusuf's wise planning saved the entire nation from starvation.\n\nYears later, Yusuf's brothers came to Egypt seeking food during the famine. They did not recognize him, but Yusuf eventually revealed himself and forgave them. He brought his whole family to Egypt, and his childhood dream came true — they all bowed before him in respect. This story is called 'Ahsan al-Qasas' — the most beautiful of stories in the Quran.",
    category: "Prophets",
    ageGroups: ["6-9", "10-13"],
    readTime: 5,
    moral:
      "Be patient through hardships — Allah's plan is always better than what we imagine.",
    icon: "sunrise",
    quiz: [
      {
        question: "Where did Yusuf's brothers throw him?",
        options: ["Into a river", "Into a well", "Into a cave", "Into the sea"],
        correctIndex: 1,
      },
      {
        question: "What special gift did Yusuf (AS) have?",
        options: [
          "Healing",
          "Interpreting dreams",
          "Speaking to animals",
          "Flying",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "prophet-musa",
    title: "Story of Prophet Musa (AS)",
    brief:
      "The Staff of Musa. See how Allah gave Musa miraculous powers to challenge the mighty Pharaoh.",
    content:
      "Prophet Musa (AS) was born at a time when the Pharaoh of Egypt was very cruel to the Children of Israel. Pharaoh had ordered that all baby boys be killed. To save baby Musa, his mother, guided by Allah, placed him in a basket and set it floating on the River Nile.\n\nThe basket was found by Pharaoh's own wife, Asiyah, who loved the baby and convinced Pharaoh to let her raise him. Allah arranged for Musa's own mother to be his nurse, so he was cared for by his real mother in Pharaoh's palace!\n\nWhen Musa grew up, he left Egypt and traveled to Madyan. There, Allah spoke to him from a burning bush on Mount Tur and gave him a great mission — to go back to Egypt and tell Pharaoh to free the Children of Israel. Allah gave Musa two miracles: his staff could turn into a huge snake, and his hand would glow with bright white light.\n\nMusa (AS) went to Pharaoh and showed him these miracles, but Pharaoh was too arrogant. He called his best magicians to compete with Musa, but Musa's staff swallowed all their tricks. The magicians themselves believed in Allah! Pharaoh still refused, so Allah sent many signs — floods, locusts, and more.\n\nFinally, Musa (AS) led the Children of Israel out of Egypt. When they reached the Red Sea with Pharaoh's army behind them, Allah told Musa to strike the sea with his staff. The sea split into two walls of water, and they walked through safely! When Pharaoh tried to follow, the sea closed over him and his army. Musa (AS) showed us that with Allah's help, nothing is impossible.",
    category: "Prophets",
    ageGroups: ["3-5", "6-9", "10-13"],
    readTime: 5,
    moral: "With Allah's help, even the most powerful tyrants can be overcome.",
    icon: "zap",
    quiz: [
      {
        question: "Where was baby Musa placed to be saved?",
        options: [
          "In a cave",
          "In a basket on the Nile",
          "On a mountain",
          "In a tree",
        ],
        correctIndex: 1,
      },
      {
        question: "What happened when Musa struck the sea?",
        options: [
          "It froze",
          "It dried up",
          "It split into two",
          "It turned to land",
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "prophet-dawud",
    title: "Story of Prophet Dawud (AS)",
    brief:
      "The Brave Shepherd. Learn how young Dawud defeated the giant Jalut with courage and faith.",
    content:
      "Prophet Dawud (AS) was a young shepherd boy who loved to praise Allah. He had a beautiful voice, and even the mountains and birds would join him in glorifying Allah. Dawud was brave, strong, and had complete trust in Allah.\n\nAt that time, the Children of Israel were facing a powerful enemy army led by a fearsome giant warrior named Jalut (Goliath). Jalut was so big and strong that none of the soldiers dared to fight him. Everyone was terrified.\n\nYoung Dawud, though small compared to the giant, stepped forward with complete faith in Allah. Armed with just a slingshot and a few stones, he faced Jalut on the battlefield. While the giant laughed at the small boy, Dawud placed his trust in Allah and launched a stone with his sling.\n\nThe stone struck Jalut on the forehead and brought the mighty giant crashing to the ground! The enemy army fled in shock, and the Children of Israel won a great victory. This showed everyone that size and strength are nothing compared to faith in Allah.\n\nAllah later made Dawud (AS) a king and a prophet. He was given the Zabur (Psalms), a holy book full of beautiful praises to Allah. Dawud was known for his justice — he was fair to everyone and always sought the truth. He also had the amazing ability to shape iron with his bare hands, which he used to make armor.",
    category: "Prophets",
    ageGroups: ["3-5", "6-9", "10-13"],
    readTime: 4,
    moral:
      "Courage and faith in Allah can help you overcome challenges much bigger than yourself.",
    icon: "shield",
    quiz: [
      {
        question: "What weapon did Dawud use against Jalut?",
        options: ["A sword", "A slingshot", "A spear", "A bow"],
        correctIndex: 1,
      },
      {
        question: "What holy book was given to Dawud (AS)?",
        options: ["The Quran", "The Torah", "The Zabur", "The Injeel"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "prophet-sulayman",
    title: "Story of Prophet Sulayman (AS)",
    brief:
      "The Wise King. Discover the prophet who could speak to animals and command the wind.",
    content:
      "Prophet Sulayman (AS) was the son of Prophet Dawud (AS). Allah blessed Sulayman with incredible gifts that no one else has ever received. He could understand the language of animals and birds, he could command the wind to carry him wherever he wanted, and even the jinn (unseen beings) obeyed his commands.\n\nOne day, as Sulayman (AS) was marching with his great army of humans, jinn, and birds, he heard an ant telling the other ants to hide so they wouldn't be crushed. Sulayman smiled at the tiny ant's words and carefully led his army around the ant colony. This showed his kindness to even the smallest creatures.\n\nSulayman (AS) also had an amazing encounter with the Hoopoe bird, who brought him news about a queen in a faraway land called Sheba (Saba). This queen and her people worshipped the sun instead of Allah. Sulayman sent her a letter inviting her to worship Allah alone.\n\nThe Queen of Sheba was curious and came to visit Sulayman with many gifts. When she arrived at his magnificent palace and saw his wisdom and the blessings Allah had given him, she was amazed. She realized that only the true God could grant such power and wisdom, and she accepted faith in Allah.\n\nDespite all his power and wealth, Sulayman (AS) was always grateful to Allah and never became proud. He used his gifts to serve Allah and to be just and kind. His story teaches us that true greatness comes from using our blessings to serve Allah and help others.",
    category: "Prophets",
    ageGroups: ["6-9", "10-13"],
    readTime: 5,
    moral:
      "True greatness is using the blessings Allah gives you to serve others and stay humble.",
    icon: "wind",
    quiz: [
      {
        question: "What could Sulayman (AS) understand?",
        options: [
          "The future",
          "The language of animals",
          "Hidden treasures",
          "The stars",
        ],
        correctIndex: 1,
      },
      {
        question: "Who did the Hoopoe bird bring news about?",
        options: ["Pharaoh", "Queen of Sheba", "King of Rome", "The jinn king"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "prophet-yunus",
    title: "Story of Prophet Yunus (AS)",
    brief:
      "The Prophet in the Whale. Learn how Yunus was saved from the belly of a whale by Allah's mercy.",
    content:
      "Prophet Yunus (AS) was sent to the people of Nineveh, a great city whose people had turned away from Allah. Yunus called them to worship Allah and leave their bad ways, but they refused to listen. Day after day, they ignored his message.\n\nFeeling frustrated and upset, Yunus (AS) left the city without waiting for Allah's command. He went to the sea and boarded a ship. But out on the open water, a terrible storm arose. The ship was tossing and turning in the huge waves, and the sailors feared it would sink.\n\nThe sailors decided to draw lots to see who should be thrown overboard to lighten the ship. The lot fell on Yunus (AS), and he was cast into the dark, stormy sea. Allah sent a huge whale that swallowed Yunus whole! Inside the dark belly of the whale, Yunus (AS) realized his mistake.\n\nIn that dark place — in the darkness of the whale, the darkness of the sea, and the darkness of the night — Yunus (AS) called out to Allah with a beautiful prayer: 'La ilaha illa Anta, Subhanaka, inni kuntu min adh-dhalimin' (There is no god but You, Glory be to You, I was among the wrongdoers). Allah heard his sincere prayer and forgave him.\n\nAllah commanded the whale to release Yunus (AS) onto the shore. He was weak and unwell, but Allah caused a special plant to grow over him to give him shade and nourishment. When Yunus recovered, he returned to Nineveh and found that his people had actually repented and believed in Allah! This story reminds us that Allah's mercy is always near when we sincerely turn to Him.",
    category: "Prophets",
    ageGroups: ["3-5", "6-9", "10-13"],
    readTime: 5,
    moral:
      "Never lose hope in Allah's mercy — sincerely calling upon Him can save you from any difficulty.",
    icon: "droplet",
    quiz: [
      {
        question: "What swallowed Prophet Yunus (AS)?",
        options: ["A shark", "A whale", "A dolphin", "A crocodile"],
        correctIndex: 1,
      },
      {
        question: "What did Yunus do inside the whale?",
        options: [
          "He slept",
          "He prayed to Allah",
          "He tried to escape",
          "He gave up",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "prophet-isa",
    title: "Story of Prophet Isa (AS)",
    brief:
      "Born of a Miracle. Discover the prophet who spoke as a baby and performed amazing miracles.",
    content:
      "Prophet Isa (AS) was born in a miraculous way. His mother, Maryam (AS), was a pious and devoted woman who spent her time worshipping Allah in the temple. One day, the Angel Jibreel appeared to her and told her that Allah would bless her with a son — even though she was not married. This was a miracle from Allah.\n\nWhen baby Isa was born, people were shocked and accused Maryam of wrongdoing. But the newborn baby Isa spoke from his cradle, defending his mother! He said: 'I am the servant of Allah. He has given me the Scripture and made me a prophet.' The people were amazed at this miracle.\n\nAs Isa (AS) grew up, Allah gave him the ability to perform many miracles. He could heal the blind and the sick, and by Allah's permission, he could even bring the dead back to life. He made a bird from clay and breathed into it, and it became a real bird — all by Allah's permission.\n\nIsa (AS) called the Children of Israel to worship Allah alone and to follow the true teachings. He was given the Injeel (Gospel) as guidance. Some people followed him and became his disciples, but many others rejected him and even plotted against him.\n\nWhen his enemies tried to capture and harm Isa (AS), Allah raised him up to the heavens. Muslims believe that Isa (AS) was not killed but was taken up by Allah, and that he will return before the Day of Judgment. Isa (AS) is one of the greatest prophets in Islam, and his story teaches us about the amazing power of Allah.",
    category: "Prophets",
    ageGroups: ["6-9", "10-13"],
    readTime: 5,
    moral:
      "Allah can do anything — His miracles remind us of His unlimited power and wisdom.",
    icon: "cloud",
    quiz: [
      {
        question: "What miracle happened when Isa (AS) was a baby?",
        options: [
          "He walked",
          "He spoke from the cradle",
          "He healed someone",
          "He flew",
        ],
        correctIndex: 1,
      },
      {
        question: "What holy book was given to Isa (AS)?",
        options: ["The Quran", "The Zabur", "The Injeel", "The Torah"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "prophet-muhammad",
    title: "Story of Prophet Muhammad (SAW)",
    brief:
      "The Final Messenger. Learn about the beloved Prophet who brought the Quran to all of humanity.",
    content:
      "Prophet Muhammad (SAW) was born in Makkah in the Year of the Elephant. His father Abdullah passed away before he was born, and his mother Aminah passed away when he was just six years old. He was raised by his loving grandfather Abdul Muttalib and then by his kind uncle Abu Talib.\n\nEven as a young man, Muhammad (SAW) was known for his honesty and trustworthiness. The people of Makkah called him 'Al-Amin' (the Trustworthy) and 'As-Sadiq' (the Truthful). He worked as a merchant and was known for his excellent character.\n\nAt the age of 40, while meditating in the Cave of Hira on a mountain near Makkah, the Angel Jibreel appeared to him and revealed the first words of the Quran: 'Read! In the name of your Lord who created.' This was the beginning of his prophethood.\n\nThe Prophet (SAW) began teaching the message of Islam — that there is only one God, Allah, and that all people should worship Him alone. Many people opposed him, and the early Muslims faced terrible persecution. But the Prophet (SAW) remained patient and kind, even to his enemies.\n\nAfter 13 years in Makkah, the Prophet (SAW) and his followers migrated to Madinah, where they established the first Muslim community. Over the next 10 years, Islam spread throughout Arabia. The Prophet (SAW) taught kindness, justice, generosity, and love for all of Allah's creation. He is the most beloved person in Islam and the final messenger sent to guide all of humanity until the Day of Judgment.",
    category: "Prophets",
    ageGroups: ["3-5", "6-9", "10-13"],
    readTime: 5,
    moral:
      "Good character, honesty, and kindness are the best ways to share the message of Islam.",
    icon: "sun",
    quiz: [
      {
        question: "What did the people of Makkah call Prophet Muhammad (SAW)?",
        options: [
          "The Brave",
          "The Trustworthy (Al-Amin)",
          "The Powerful",
          "The Rich",
        ],
        correctIndex: 1,
      },
      {
        question: "Where was the first revelation received?",
        options: ["In the Kaaba", "In Madinah", "In Cave Hira", "In Jerusalem"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "abu-bakr",
    title: "Abu Bakr (RA) - The Truthful Friend",
    brief:
      "The Truthful Friend. Discover the story of the Prophet's closest companion and the first Caliph.",
    content:
      "Abu Bakr (RA) was the closest friend and companion of Prophet Muhammad (SAW). He was a respected merchant in Makkah known for his gentle nature, wisdom, and kindness. When the Prophet (SAW) first received the message of Islam, Abu Bakr was one of the very first people to believe — without any hesitation.\n\nBecause of his immediate and unwavering belief, Abu Bakr earned the title 'As-Siddiq' (the Truthful). When the Prophet (SAW) told the people about his miraculous Night Journey (Isra and Mi'raj) to Jerusalem and the heavens, some people doubted the story. But Abu Bakr said without hesitation: 'If he said it, then it is true.' His trust in the Prophet was absolute.\n\nAbu Bakr (RA) spent his wealth generously for the sake of Islam. He freed many slaves who were being tortured for accepting Islam, including Bilal (RA). He gave away so much of his wealth that when the Prophet asked people to donate, Abu Bakr once brought everything he owned. When asked what he left for his family, he simply said: 'I left them Allah and His Messenger.'\n\nDuring the Hijrah (migration) to Madinah, Abu Bakr was the Prophet's companion in the cave of Thawr, where they hid from the Quraysh. When Abu Bakr was worried about their enemies finding them, the Prophet comforted him saying: 'Do not be sad, Allah is with us.'\n\nAfter the Prophet (SAW) passed away, Abu Bakr became the first Caliph of Islam. Though heartbroken by the loss of his beloved friend, he led the Muslim community with wisdom, justice, and courage. His story teaches us about the beauty of true friendship, generosity, and unshakable faith.",
    category: "Sahabah",
    ageGroups: ["6-9", "10-13"],
    readTime: 5,
    moral:
      "A true friend stands by you through everything — loyalty and generosity are the marks of great faith.",
    icon: "heart",
    quiz: [
      {
        question: "What title was Abu Bakr (RA) given?",
        options: [
          "The Just",
          "The Truthful (As-Siddiq)",
          "The Brave",
          "The Wise",
        ],
        correctIndex: 1,
      },
      {
        question: "Who accompanied the Prophet in the cave during Hijrah?",
        options: ["Umar", "Ali", "Abu Bakr", "Uthman"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "umar",
    title: "Umar ibn Al-Khattab (RA) - The Just Leader",
    brief:
      "The Just Leader. Learn about the powerful companion who became known for his incredible justice.",
    content:
      "Umar ibn Al-Khattab (RA) was one of the strongest and most respected men in Makkah before Islam. At first, he was a fierce opponent of Islam and the Muslims feared him. The Prophet (SAW) once prayed to Allah to strengthen Islam with either of two Umars — and Allah chose Umar ibn Al-Khattab.\n\nUmar's conversion to Islam is one of the most dramatic stories in Islamic history. One day, he set out with a sword intending to harm the Prophet. On the way, he learned that his own sister and her husband had become Muslim. He went to their house and heard them reciting the Quran. The beautiful words of Surah Ta-Ha touched his heart so deeply that he immediately went to the Prophet and declared his faith.\n\nOnce Umar became Muslim, the Muslims gained tremendous strength and confidence. He was fearless in declaring his faith openly. The Prophet (SAW) gave him the title 'Al-Farooq' (the one who distinguishes between right and wrong).\n\nAs the second Caliph of Islam, Umar (RA) was legendary for his justice. He would walk the streets at night to check on his people and make sure no one was hungry or in need. He once said: 'If a camel stumbles on the road in Iraq, I would fear that Allah would ask me why I did not pave the road for it.'\n\nUmar (RA) expanded the Muslim lands greatly but lived an incredibly simple life. Despite ruling a vast empire, he wore patched clothes and ate simple food. His justice, humility, and care for all people — Muslim and non-Muslim alike — set an example that is remembered to this day.",
    category: "Sahabah",
    ageGroups: ["6-9", "10-13"],
    readTime: 5,
    moral:
      "True leadership means serving the people with justice, humility, and care for everyone.",
    icon: "award",
    quiz: [
      {
        question: "What title was Umar (RA) given?",
        options: ["As-Siddiq", "Al-Farooq", "Al-Amin", "Al-Ghani"],
        correctIndex: 1,
      },
      {
        question: "What changed Umar's heart toward Islam?",
        options: ["A battle", "Hearing the Quran", "A dream", "Money"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "khadijah",
    title: "Khadijah (RA) - The First Believer",
    brief:
      "The First Believer. Meet the remarkable woman who was the first person to accept Islam.",
    content:
      "Khadijah bint Khuwaylid (RA) was one of the most remarkable women in Islamic history. She was a successful businesswoman in Makkah, known for her intelligence, wisdom, and noble character. She was so respected that people called her 'At-Tahira' (the Pure One) even before Islam.\n\nKhadijah heard about a young man named Muhammad who was known for his honesty and trustworthiness. She hired him to lead her trade caravan to Syria. When Muhammad returned with excellent profits and her servant reported his outstanding character, Khadijah was deeply impressed.\n\nKhadijah (RA) proposed marriage to Muhammad (SAW), and he accepted. Despite being older and wealthier, she was a loving and supportive wife. Their marriage was one of deep love, respect, and partnership. The Prophet (SAW) remembered Khadijah with love and gratitude throughout his life.\n\nWhen the Prophet (SAW) received the first revelation in Cave Hira and came home shaken, it was Khadijah who comforted him. She reminded him of his truthfulness, family ties, and care for the vulnerable. She became the very first person to accept Islam.\n\nKhadijah (RA) supported the Prophet through the most difficult years of his mission. She spent her wealth to help the poor Muslims and stood by him when many others opposed him. Muslims remember her as a model of courage, loyalty, and faith.",
    category: "Sahabah",
    ageGroups: ["6-9", "10-13"],
    readTime: 5,
    moral:
      "Supporting those who do good and standing by them in hard times is one of the greatest acts of faith.",
    icon: "gift",
    quiz: [
      {
        question: "Who was the first person to accept Islam?",
        options: ["Abu Bakr", "Umar", "Khadijah", "Ali"],
        correctIndex: 2,
      },
      {
        question: "What did people call Khadijah before Islam?",
        options: [
          "The Beautiful",
          "The Pure One",
          "The Strong",
          "The Generous",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "bilal",
    title: "Bilal (RA) - The First Muezzin",
    brief:
      "The First Muezzin. Discover how Bilal's beautiful voice called Muslims to prayer for the first time.",
    content:
      "Bilal ibn Rabah (RA) was an Abyssinian (Ethiopian) slave in Makkah who accepted Islam in its earliest days. When his cruel master Umayyah ibn Khalaf found out, he tortured Bilal mercilessly. He would place heavy rocks on Bilal's chest under the scorching desert sun, demanding that he renounce his faith.\n\nBut Bilal (RA) refused to give up his belief in Allah. Under the crushing weight of the rocks and the burning heat, he would repeat one word over and over: 'Ahad! Ahad!' (One! One!) — declaring his belief in the One God, Allah. His faith was stronger than any punishment.\n\nAbu Bakr (RA) heard about Bilal's suffering and bought his freedom. From that day, Bilal became one of the closest companions of the Prophet (SAW). He was always by the Prophet's side, serving Islam with love and devotion.\n\nBilal (RA) had a beautiful, powerful voice. When the Muslims needed a way to call people to prayer, the Prophet (SAW) chose Bilal to be the very first Muezzin — the person who calls the Adhan (call to prayer). His voice would ring out over Madinah, calling the faithful to worship Allah.\n\nBilal's story is one of the most powerful examples of how Islam values all people equally, regardless of their color, background, or social status. A former slave became one of the most honored companions of the Prophet (SAW), chosen for one of the most beautiful duties in Islam. His courage and faith continue to inspire millions around the world.",
    category: "Sahabah",
    ageGroups: ["3-5", "6-9", "10-13"],
    readTime: 4,
    moral:
      "All people are equal before Allah — courage and faith matter more than wealth or status.",
    icon: "mic",
    quiz: [
      {
        question: "What word did Bilal repeat while being tortured?",
        options: ["Help!", "Ahad! (One!)", "Stop!", "Allah!"],
        correctIndex: 1,
      },
      {
        question: "What special role was Bilal given?",
        options: ["Imam", "First Muezzin", "Guard", "Teacher"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "fatimah",
    title: "Fatimah (RA) - A Life of Patience",
    brief:
      "A gentle story about the beloved daughter of Prophet Muhammad (SAW).",
    content:
      "Fatimah (RA) was the youngest and beloved daughter of Prophet Muhammad (SAW) and Khadijah (RA). She was born in Makkah and grew up watching her parents dedicate their lives to spreading the message of Islam. From a very young age, she showed beautiful care for her family.\n\nFatimah was incredibly close to her father. She cared for him deeply, especially during the difficult years in Makkah. When the people of Makkah hurt the Prophet while he was praying, little Fatimah would rush to clean him and comfort him with tears in her eyes. Many Muslims remember her with the loving nickname 'Umm Abiha' (the mother of her father) because of how tenderly she cared for him.\n\nFatimah (RA) married Ali ibn Abi Talib (RA), the cousin of the Prophet. Together they lived a simple life. Despite being the daughter of the Prophet, Fatimah did not chase worldly possessions. She worked hard at home and showed patience through difficulty.\n\nMuslims often remember Fatimah through a bedtime dhikr: saying 'SubhanAllah' 33 times, 'Alhamdulillah' 33 times, and 'Allahu Akbar' 34 times before sleeping. This remembrance is known as 'Tasbih Fatimah' and helps families end the day with gratitude and worship.\n\nFatimah is remembered for her patience, devotion, and incredible love for her family and for Allah. Her simple yet powerful life shows that true richness lies in faith, family, and the remembrance of Allah.",
    category: "Sahabah",
    ageGroups: ["6-9", "10-13"],
    readTime: 5,
    moral:
      "Remembering Allah and being grateful brings more peace than any material comfort.",
    icon: "feather",
    quiz: [
      {
        question: "What loving nickname is Fatimah remembered with?",
        options: [
          "The Kind",
          "Mother of her father",
          "The Scholar",
          "The Helper",
        ],
        correctIndex: 1,
      },
      {
        question: "What is Tasbih Fatimah?",
        options: [
          "A special prayer",
          "A dhikr before sleeping",
          "A type of food",
          "A type of clothing",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "sharing-food",
    title: "The Boy Who Shared His Food",
    brief:
      "A beautiful story about a young boy who learns the joy of sharing his food with others.",
    content:
      "There was once a young boy named Yusuf who lived in a small village. Every day, his mother packed him a delicious lunch to take to the madrasa (Islamic school). She would make his favorite foods with love and care, and Yusuf looked forward to eating it every day.\n\nOne day, Yusuf noticed a new boy at the madrasa named Hamza. Hamza sat alone during lunch time and had no food to eat. He looked sad and hungry. Yusuf's other friends said they should just ignore Hamza, but Yusuf remembered that Islam teaches Muslims to care about others and not keep blessings only for themselves.\n\nYusuf walked over to Hamza and sat down next to him. He split his lunch in half and offered it to Hamza. Hamza's eyes lit up with happiness and gratitude. 'Thank you!' Hamza said with a big smile. They ate together and talked, and soon they became the best of friends.\n\nThe next day, Yusuf told his mother about Hamza. She was so proud of her son that she started packing extra food every day. Other children in the class saw what Yusuf did and started sharing their food too. Soon, lunch time became a time of sharing and friendship, and no one in the madrasa went hungry.\n\nThe teacher praised Yusuf and reminded the class that caring for hungry neighbors and classmates is part of beautiful Muslim character. Yusuf learned that the happiness you get from sharing is much greater than the happiness of eating alone. And Hamza remained his best friend forever.",
    category: "Manners",
    ageGroups: ["3-5", "6-9"],
    readTime: 3,
    moral:
      "Sharing with others brings more happiness than keeping everything for yourself.",
    icon: "share-2",
    quiz: [
      {
        question: "What did Yusuf do when he saw Hamza had no food?",
        options: [
          "He ignored him",
          "He told the teacher",
          "He shared his food",
          "He went home",
        ],
        correctIndex: 2,
      },
      {
        question: "What happened after Yusuf started sharing?",
        options: [
          "Nothing changed",
          "Other kids shared too",
          "The teacher was angry",
          "Yusuf ran out of food",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "quran-girl",
    title: "The Girl Who Loved the Quran",
    brief:
      "Meet Amina, a young girl whose love for the Quran inspires everyone around her.",
    content:
      "In a busy city, there lived a young girl named Amina who had a special love for the Quran. Every morning before school, she would sit with her mother and practice reading a few verses. Her voice was soft and sweet, and she tried her very best to pronounce every letter correctly.\n\nAt first, reading the Quran was difficult for Amina. The Arabic letters were hard to remember, and some words were tricky to say. She sometimes felt like giving up, but her grandmother reminded her that Allah sees every sincere effort, even when learning feels slow.\n\nThis encouraged Amina to keep trying. She practiced every single day, even when she was tired. She would listen to recordings of Quran reciters and try to improve carefully. Slowly but surely, her reading improved. She started memorizing short surahs, beginning with Surah Al-Fatiha and the short surahs at the end of the Quran.\n\nAmina's friends noticed how peaceful she seemed after her daily practice. They asked her secret, and she told them about her Quran routine. Soon, some of her friends started reading the Quran too. They formed a small Quran circle at school where they would practice together.\n\nBy the end of the year, Amina had memorized the last ten surahs of the Quran. Her teacher organized a small celebration, and Amina recited in front of her family and friends. Amina showed everyone that with love, patience, and daily practice, anyone can build a beautiful connection with the Quran.",
    category: "Manners",
    ageGroups: ["3-5", "6-9"],
    readTime: 3,
    moral:
      "Consistent daily practice with love and patience is the key to learning the Quran.",
    icon: "book",
    quiz: [
      {
        question: "What did Amina practice every morning?",
        options: ["Math", "Sports", "Reading the Quran", "Drawing"],
        correctIndex: 2,
      },
      {
        question: "What helped Amina keep practising?",
        options: [
          "Remembering Allah sees sincere effort",
          "Giving up",
          "Skipping practice",
          "Only reading once a year",
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "kind-animals",
    title: "Being Kind to Animals in Islam",
    brief:
      "A gentle story about how Islam teaches us to care for Allah's creatures.",
    content:
      "Islam teaches us to be kind and gentle to all of Allah's creatures — big and small. One hot day, a child named Mariam noticed a thirsty cat near her home. The cat was panting and hiding in the shade, so Mariam filled a small bowl with clean water and placed it nearby.\n\nAt first the cat was scared, but Mariam stepped back quietly and waited. Soon the cat came forward and drank. Mariam smiled because she knew Allah sees every act of mercy, even when it is small and quiet.\n\nThe next week, Mariam and her brother made a small habit of checking that animals near their home had shade and water on very hot days. They also learned not to tease animals, chase them, or take them away from their young.\n\nTheir teacher reminded the class that Allah made human beings caretakers on Earth. That means Muslims should treat animals with mercy, avoid cruelty, and be responsible with the creatures Allah has placed around us.\n\nWhether it is giving water to a thirsty animal, moving safely around insects, or reminding a friend to be gentle, kindness to Allah's creatures is part of beautiful Muslim character.",
    category: "Manners",
    ageGroups: ["3-5", "6-9", "10-13"],
    readTime: 4,
    moral: "Being kind to animals is part of beautiful Muslim character.",
    icon: "heart",
    quiz: [
      {
        question: "What did Mariam give the thirsty cat?",
        options: ["A toy", "Clean water", "A blanket", "A book"],
        correctIndex: 1,
      },
      {
        question: "What did the teacher remind the class?",
        options: [
          "Animals should be teased",
          "Animals should be ignored",
          "Humans are caretakers on Earth",
          "Cats never need water",
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "honesty",
    title: "Honesty: The Best Policy",
    brief:
      "Learn why honesty is one of the most important qualities a Muslim can have.",
    content:
      "In a small town, there lived a boy named Ahmad who was known for always telling the truth. His parents taught him from a young age that Allah sees what is hidden and what is shown, so honesty matters even when no one else is watching.\n\nOne day at school, Ahmad accidentally broke a window while playing. His friends told him to run away and not tell anyone. 'No one saw us,' they said. 'Just blame it on the wind!' But Ahmad knew that even if no person saw him, Allah sees everything.\n\nAhmad went to his teacher and told the truth. 'I'm sorry, I broke the window while playing,' he said honestly. His teacher was surprised but also very proud. Instead of being angry, the teacher praised Ahmad for his honesty and told the whole class about the importance of truthfulness.\n\nA few weeks later, something valuable went missing from the classroom. Several students were suspected, including Ahmad. But the teacher immediately said: 'I know it wasn't Ahmad. He's the most honest student I've ever had.' Ahmad's reputation for truthfulness protected him and earned him everyone's trust.\n\nAhmad learned that honesty might sometimes be difficult, but it builds trust over time. People trust you, respect you, and most importantly, honesty is part of living with taqwa. One small act of honesty can help build a lifetime of trust.",
    category: "Manners",
    ageGroups: ["3-5", "6-9", "10-13"],
    readTime: 3,
    moral:
      "Honesty may be hard sometimes, but it builds trust and leads to Allah's pleasure.",
    icon: "check-circle",
    quiz: [
      {
        question: "What did Ahmad do after breaking the window?",
        options: [
          "He ran away",
          "He blamed others",
          "He told the truth",
          "He hid",
        ],
        correctIndex: 2,
      },
      {
        question: "What was the Prophet known as?",
        options: [
          "The Rich",
          "The Trustworthy (Al-Amin)",
          "The Strong",
          "The Clever",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "helping-neighbors",
    title: "Helping Your Neighbors",
    brief:
      "A heartwarming story about how helping neighbors is a beautiful part of being a good Muslim.",
    content:
      "Little Zahra and her family had just moved to a new neighborhood. Her mother reminded her that Islam teaches Muslims to honor neighbors, notice their needs, and avoid letting anyone nearby feel forgotten.\n\nZahra noticed that their elderly neighbor, Aunty Fatima, lived alone and sometimes had difficulty carrying her groceries. Without being asked, Zahra ran over and helped carry the heavy bags inside. Aunty Fatima was so happy that tears came to her eyes. 'Jazakallah khayran, my dear!' she said warmly.\n\nFrom that day, Zahra made it a habit to check on Aunty Fatima regularly. She would bring her food that her mother cooked, help sweep her front porch, and sometimes just sit and talk with her. Aunty Fatima, who used to feel lonely, now looked forward to Zahra's visits.\n\nZahra's kindness spread through the neighborhood. When the family next door was sick, Zahra's mother cooked food for them. When the new family across the street moved in, everyone welcomed them warmly. The whole neighborhood became like one big family, all because one little girl decided to be kind.\n\nZahra learned that being a good neighbor is not only about smiling at the door. It is about truly caring for the people around you, sharing what you can, and helping them when they need support.",
    category: "Manners",
    ageGroups: ["3-5", "6-9"],
    readTime: 3,
    moral:
      "Treating your neighbors with kindness and care is part of beautiful Muslim character.",
    icon: "home",
    quiz: [
      {
        question: "Who did Zahra help in her neighborhood?",
        options: [
          "A teacher",
          "An elderly neighbor",
          "A shopkeeper",
          "A stranger",
        ],
        correctIndex: 1,
      },
      {
        question: "What did Zahra learn about neighbors?",
        options: [
          "Ignore them",
          "Care for them and help when you can",
          "Compete with them",
          "Avoid them",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "hoopoe-bird",
    title: "The Hoopoe Bird of Sulayman",
    brief:
      "The story of the special bird that brought important news to Prophet Sulayman from a faraway land.",
    content:
      "Prophet Sulayman (AS) had a magnificent army made up of humans, jinn, and birds. Every creature had a role and a duty. Among the birds was a beautiful Hoopoe (called 'Hudhud' in Arabic) — a bird with a colorful crown of feathers on its head.\n\nOne day, Prophet Sulayman was inspecting his army and noticed that the Hoopoe was missing. He was not pleased and said he would punish the bird unless it brought him a good reason for its absence. When the Hoopoe finally returned, it had amazing news!\n\nThe Hoopoe told Sulayman: 'I have come to you from Sheba (Saba) with certain news. I found a woman ruling over them who has been given everything, and she has a great throne. I found her and her people bowing down to the sun instead of Allah.' The Hoopoe was upset that they worshipped the sun instead of Allah!\n\nProphet Sulayman was impressed by the Hoopoe's report. He sent the bird back with a letter to the Queen of Sheba, inviting her to worship Allah alone. This led to the Queen's famous visit to Sulayman's kingdom and eventually her acceptance of faith in Allah.\n\nThis story from Surah An-Naml (The Ants) in the Quran shows us that even a small bird can play a huge role in spreading good. The Hoopoe was brave enough to investigate, honest in reporting what it saw, and concerned about people worshipping other than Allah. It reminds us that no matter how small we are, we can make a big difference.",
    category: "Animals",
    ageGroups: ["3-5", "6-9", "10-13"],
    readTime: 4,
    moral:
      "No matter how small you are, you can make a big difference by standing up for what is right.",
    icon: "feather",
    quiz: [
      {
        question: "What news did the Hoopoe bring Sulayman?",
        options: [
          "About a flood",
          "About a queen who worshipped the sun",
          "About treasure",
          "About a war",
        ],
        correctIndex: 1,
      },
      {
        question: "What is the Hoopoe called in Arabic?",
        options: ["Bulbul", "Hudhud", "Naml", "Dajaj"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "elephant-army",
    title: "The Elephant Army (Surah Al-Fil)",
    brief:
      "The incredible story of how Allah destroyed the army of elephants that tried to destroy the Kaaba.",
    content:
      "In the year that Prophet Muhammad (SAW) was born, a powerful ruler named Abraha from Yemen decided to destroy the Kaaba in Makkah. Abraha had built a grand cathedral in Yemen and wanted people to come there for pilgrimage instead of going to the Kaaba. When the Arabs refused, Abraha was furious.\n\nAbraha gathered a massive army and marched toward Makkah. His army included a huge war elephant — the biggest and most terrifying animal the Arabs had ever seen. The people of Makkah were small in number and had no army strong enough to fight such a force. They were terrified.\n\nAbdul Muttalib, the grandfather of the Prophet (SAW) and the leader of Makkah, told his people to leave the city and take shelter in the mountains. When Abraha's men took Abdul Muttalib's camels, he went to ask for them back. Abraha was surprised: 'I came to destroy your sacred house, and you're asking about camels?' Abdul Muttalib replied wisely: 'I am the lord of the camels, and the House has its own Lord who will protect it.'\n\nAs Abraha's army approached the Kaaba, something miraculous happened. Allah sent flocks of birds, each carrying small stones of baked clay. These birds flew over the army and pelted the soldiers with the stones. The stones destroyed the entire army! The mighty elephant refused to move toward the Kaaba, kneeling down in submission to Allah.\n\nThis event is recorded in Surah Al-Fil (The Elephant) in the Quran. It showed the world that Allah protects His sacred house. The year became known as the Year of the Elephant ('Am al-Fil), and it was in this very year that Prophet Muhammad (SAW) was born — a sign of the great blessings to come.",
    category: "Animals",
    ageGroups: ["3-5", "6-9", "10-13"],
    readTime: 4,
    moral:
      "Allah protects what is sacred — no army, no matter how powerful, can defeat Allah's plan.",
    icon: "shield",
    quiz: [
      {
        question: "What did Abraha want to destroy?",
        options: ["Madinah", "The Kaaba", "Yemen", "A palace"],
        correctIndex: 1,
      },
      {
        question: "What did Allah send to stop the army?",
        options: ["A storm", "An earthquake", "Birds with stones", "A flood"],
        correctIndex: 2,
      },
    ],
  },
  {
    id: "spider-cave",
    title: "The Cave of Thawr",
    brief:
      "How Allah reassured Prophet Muhammad (SAW) and Abu Bakr during the Hijrah.",
    content:
      "When Prophet Muhammad (SAW) and Abu Bakr (RA) were migrating from Makkah to Madinah, the leaders of the Quraysh were hunting for them. They had put a large reward for anyone who could capture the Prophet. Dangerous men were searching everywhere.\n\nThe Prophet (SAW) and Abu Bakr hid in a small cave on Mount Thawr, south of Makkah. Abu Bakr was very worried because the searchers came so close that it seemed they might find them.\n\nIn that frightening moment, the Prophet (SAW) reassured Abu Bakr with the words preserved in the Quran: 'Do not be sad; indeed Allah is with us.' (Quran 9:40). Allah protected them, and the Hijrah continued until they reached Madinah.\n\nThis story teaches us that believers can trust Allah even when a situation looks impossible. Abu Bakr felt fear, but he was not alone. The Prophet reminded him that Allah's care was nearer than the danger outside the cave.",
    category: "Animals",
    ageGroups: ["3-5", "6-9", "10-13"],
    readTime: 4,
    moral: "Allah's help can be near even when danger feels close.",
    icon: "compass",
    quiz: [
      {
        question: "Where did the Prophet and Abu Bakr hide?",
        options: ["In a house", "In a cave", "In a tree", "Under a bridge"],
        correctIndex: 1,
      },
      {
        question: "Which Quran verse is remembered in this story?",
        options: ["Quran 9:40", "Quran 1:1", "Quran 112:1", "Quran 55:13"],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "year-elephant",
    title: "The Year of the Elephant",
    brief:
      "The year that changed history forever — when the Prophet Muhammad (SAW) was born.",
    content:
      "The Year of the Elephant (approximately 570 CE) is one of the most important years in Islamic history. It was the year when the great army of Abraha, led by a massive war elephant, tried to destroy the Kaaba in Makkah — and was defeated by Allah's command.\n\nAfter Abraha's army was destroyed by the birds sent by Allah, the people of Arabia were in awe. The event was so significant that the Arabs named the year after it — calling it 'Am al-Fil' (the Year of the Elephant).\n\nIt was in this year that Prophet Muhammad (SAW) was born in Makkah. His life would later transform Arabia and call people back to worshipping Allah alone.\n\nThe Prophet (SAW) grew up to become the last and final messenger of Allah, bringing the message of Islam — a message of mercy, justice, and worship of the One God.\n\nThe connection between Surah Al-Fil and the Prophet's birth helps children remember that Allah protected the Kaaba before the final messenger's mission began in Makkah.",
    category: "History",
    ageGroups: ["6-9", "10-13"],
    readTime: 4,
    moral:
      "Allah's plan is perfect — He prepares the world for His greatest blessings in amazing ways.",
    icon: "calendar",
    quiz: [
      {
        question: "What important event happened in the Year of the Elephant?",
        options: [
          "The Hijrah",
          "The birth of Prophet Muhammad (SAW)",
          "The conquest of Makkah",
          "The Battle of Badr",
        ],
        correctIndex: 1,
      },
      {
        question: "What does 'Am al-Fil' mean?",
        options: [
          "Year of Light",
          "Year of the Elephant",
          "Year of Victory",
          "Year of Peace",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "hijrah",
    title: "The Journey to Madinah (Hijrah)",
    brief:
      "The historic migration that changed the course of Islamic history and began a new calendar.",
    content:
      "For 13 years in Makkah, Prophet Muhammad (SAW) and the Muslims faced terrible persecution. They were beaten, boycotted, and some were even killed for their belief in one God. The people of Makkah made life so difficult that the Muslims could barely practice their faith.\n\nAllah opened a door of hope. People from the city of Yathrib (later called Madinah) came to Makkah and accepted Islam. They invited the Prophet and the Muslims to come live with them, promising to protect and support them. The Prophet (SAW) told the Muslims to begin migrating to Madinah in small groups.\n\nThe leaders of the Quraysh found out about the plan and decided to kill the Prophet (SAW) before he could leave. They surrounded his house one night, planning to strike together. But Allah protected the Prophet, and he left with Abu Bakr.\n\nThe journey was dangerous. The Prophet (SAW) and Abu Bakr traveled through the desert, hiding in the Cave of Thawr while the Quraysh searched everywhere for them. In the cave, the Prophet reassured Abu Bakr with the Quranic words: 'Do not be sad; indeed Allah is with us.' (Quran 9:40). They finally reached Madinah, guided through secret desert paths.\n\nWhen the Prophet (SAW) arrived in Madinah, the community welcomed him with joy. The Prophet built the first mosque, established brotherhood between the Muhajirun (migrants) and the Ansar (helpers), and created a just society. The Hijrah was so important that it became the starting point of the Islamic calendar. It marks the moment when Islam went from a persecuted faith to a thriving community.",
    category: "History",
    ageGroups: ["6-9", "10-13"],
    readTime: 5,
    moral:
      "Sometimes leaving what is familiar for the sake of Allah leads to the greatest blessings and opportunities.",
    icon: "map",
    quiz: [
      {
        question: "Where did the Muslims migrate to?",
        options: ["Syria", "Yemen", "Madinah", "Egypt"],
        correctIndex: 2,
      },
      {
        question: "What does the Islamic calendar start from?",
        options: [
          "The birth of the Prophet",
          "The Hijrah",
          "The conquest of Makkah",
          "The first revelation",
        ],
        correctIndex: 1,
      },
    ],
  },
];

type QuizState = {
  storyId: string;
  currentQuestion: number;
  answers: (number | null)[];
  completed: boolean;
  score: number;
};

export default function KidsStoriesScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { storyProgress, markStoryRead, saveQuizScore, recordActivity } =
    useKidsMode();
  const { isPremium } = useSubscription();

  const [filterCategory, setFilterCategory] = useState<"All" | StoryCategory>(
    "All",
  );
  const [searchText, setSearchText] = useState("");
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);

  const getColor = (key: keyof typeof CategoryColors) =>
    isDark ? CategoryColors[key].dark : CategoryColors[key];

  const isStoryRead = (storyId: string) =>
    storyProgress.some((s) => s.storyId === storyId && s.completed);

  const filteredStories = useMemo(() => {
    let result = STORIES;
    if (filterCategory !== "All") {
      result = result.filter((s) => s.category === filterCategory);
    }
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.brief.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query),
      );
    }
    return result;
  }, [filterCategory, searchText]);

  const handleStoryPress = async (story: Story) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStory(story);
    setQuizState(null);
  };

  const handleMarkAsRead = async (story: Story) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markStoryRead(story.id);
    setQuizState({
      storyId: story.id,
      currentQuestion: 0,
      answers: [null, null],
      completed: false,
      score: 0,
    });
  };

  const handleQuizAnswer = async (answerIndex: number) => {
    if (!quizState || !selectedStory) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const currentQ = selectedStory.quiz[quizState.currentQuestion];
    const isCorrect = answerIndex === currentQ.correctIndex;
    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentQuestion] = answerIndex;
    const newScore = quizState.score + (isCorrect ? 1 : 0);

    if (quizState.currentQuestion < selectedStory.quiz.length - 1) {
      setQuizState({
        ...quizState,
        currentQuestion: quizState.currentQuestion + 1,
        answers: newAnswers,
        score: newScore,
      });
    } else {
      setQuizState({
        ...quizState,
        answers: newAnswers,
        completed: true,
        score: newScore,
      });
      await saveQuizScore(
        `story-${selectedStory.id}`,
        selectedStory.category,
        newScore,
        selectedStory.quiz.length,
      );
      const points = newScore * 15 + 10;
      await recordActivity(selectedStory.readTime, points);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleBackToList = () => {
    setSelectedStory(null);
    setQuizState(null);
  };

  if (selectedStory) {
    const catColor = getColor(CATEGORY_COLORS[selectedStory.category]);
    const read = isStoryRead(selectedStory.id);

    if (quizState) {
      const isCompleted = quizState.completed;
      const currentQ = isCompleted
        ? null
        : selectedStory.quiz[quizState.currentQuestion];

      return (
        <View
          style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        >
          <IslamicPatternBackground color={catColor.text} opacity={0.006} />
          <LinearGradient
            colors={
              isDark
                ? [catColor.bg, "transparent"]
                : [catColor.bg, "transparent"]
            }
            style={styles.topGradient}
          />
          <View
            style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
          >
            <Pressable
              onPress={handleBackToList}
              style={styles.headerBtn}
              testID="button-quiz-back"
            >
              <AppIcon name="arrow-left" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="h3">Quiz</ThemedText>
            <View style={styles.headerBtn} />
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              paddingBottom: insets.bottom + 40,
            }}
          >
            {isCompleted ? (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View
                  style={[
                    styles.quizResultCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <GeometricCardPattern color={catColor.text} opacity={0.012} />
                  <QuranIconSvg size={52} color={catColor.text} />
                  <ThemedText
                    type="h2"
                    style={{ textAlign: "center", marginTop: Spacing.md }}
                  >
                    Quiz Complete!
                  </ThemedText>
                  <ThemedText
                    type="body"
                    style={{
                      color: theme.textSecondary,
                      textAlign: "center",
                      marginTop: Spacing.sm,
                    }}
                  >
                    You scored {quizState.score} out of{" "}
                    {selectedStory.quiz.length}
                  </ThemedText>
                  <View
                    style={[
                      styles.scoreBadge,
                      { backgroundColor: catColor.bg },
                    ]}
                  >
                    <ThemedText type="h3" style={{ color: catColor.text }}>
                      {quizState.score === selectedStory.quiz.length
                        ? "Perfect!"
                        : quizState.score > 0
                          ? "Good Job!"
                          : "Keep Trying!"}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.textMuted,
                      textAlign: "center",
                      marginTop: Spacing.md,
                    }}
                  >
                    +{quizState.score * 15 + 10} points earned
                  </ThemedText>
                  <Pressable
                    onPress={handleBackToList}
                    style={[
                      styles.actionButton,
                      { backgroundColor: catColor.text },
                    ]}
                    testID="button-back-to-stories"
                  >
                    <Text
                      style={[
                        styles.actionButtonText,
                        { fontFamily: Fonts?.sansBold },
                      ]}
                    >
                      Back to Stories
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            ) : currentQ ? (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View
                  style={[
                    styles.quizCard,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.borderSubtle,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.quizProgressBar,
                      {
                        backgroundColor: isDark
                          ? theme.backgroundTertiary
                          : theme.backgroundSecondary,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.quizProgressFill,
                        {
                          backgroundColor: catColor.text,
                          width: `${((quizState.currentQuestion + 1) / selectedStory.quiz.length) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, marginBottom: Spacing.md }}
                  >
                    Question {quizState.currentQuestion + 1} of{" "}
                    {selectedStory.quiz.length}
                  </ThemedText>
                  <ThemedText type="h4" style={{ marginBottom: Spacing.xl }}>
                    {currentQ.question}
                  </ThemedText>
                  {currentQ.options.map((option, i) => (
                    <Animated.View
                      key={i}
                      entering={FadeInDown.delay(100 + i * 80).duration(300)}
                    >
                      <Pressable
                        onPress={() => handleQuizAnswer(i)}
                        style={[
                          styles.quizOption,
                          {
                            backgroundColor: isDark
                              ? theme.backgroundTertiary
                              : "#F8FAFC",
                            borderColor: theme.borderSubtle,
                          },
                        ]}
                        testID={`button-quiz-option-${i}`}
                      >
                        <View
                          style={[
                            styles.quizOptionLetter,
                            { backgroundColor: catColor.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.quizOptionLetterText,
                              {
                                color: catColor.text,
                                fontFamily: Fonts?.sansBold,
                              },
                            ]}
                          >
                            {String.fromCharCode(65 + i)}
                          </Text>
                        </View>
                        <ThemedText type="body" style={{ flex: 1 }}>
                          {option}
                        </ThemedText>
                      </Pressable>
                    </Animated.View>
                  ))}
                </View>
              </Animated.View>
            ) : null}
          </ScrollView>
        </View>
      );
    }

    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <IslamicPatternBackground color={catColor.text} opacity={0.006} />
        <LinearGradient
          colors={
            isDark ? [catColor.bg, "transparent"] : [catColor.bg, "transparent"]
          }
          style={styles.topGradient}
        />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={handleBackToList}
            style={styles.headerBtn}
            testID="button-detail-back"
          >
            <AppIcon name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText
            type="h3"
            numberOfLines={1}
            style={{ flex: 1, textAlign: "center" }}
          >
            Story
          </ThemedText>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 40,
          }}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <LinearGradient
              colors={
                isDark
                  ? [catColor.bg, catColor.bg + "80"]
                  : [catColor.bg, catColor.bg + "80"]
              }
              style={styles.storyHero}
            >
              <GeometricCardPattern color={catColor.text} opacity={0.012} />
              <AppIcon
                name={selectedStory.icon as any}
                size={56}
                color={catColor.text}
              />
              <ThemedText
                type="h2"
                style={{ textAlign: "center", marginTop: Spacing.md }}
              >
                {selectedStory.title}
              </ThemedText>
              <View style={styles.storyMeta}>
                <View
                  style={[
                    styles.metaBadge,
                    {
                      backgroundColor: catColor.bg,
                      borderColor: catColor.text + "30",
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: catColor.text,
                      fontFamily: Fonts?.sansSemiBold,
                    }}
                  >
                    {selectedStory.category}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.metaBadge,
                    {
                      backgroundColor: isDark
                        ? theme.backgroundTertiary
                        : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <AppIcon name="clock" size={12} color={theme.textMuted} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textMuted, marginLeft: 4 }}
                  >
                    {selectedStory.readTime} min
                  </ThemedText>
                </View>
                {read ? (
                  <View
                    style={[
                      styles.metaBadge,
                      { backgroundColor: getColor("emerald").bg },
                    ]}
                  >
                    <AppIcon
                      name="check-circle"
                      size={12}
                      color={getColor("emerald").text}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: getColor("emerald").text, marginLeft: 4 }}
                    >
                      Read
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <GoldDivider
                color={catColor.text}
                opacity={0.42}
                style={styles.storyDivider}
              />
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View
              style={[
                styles.storyContentCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <GeometricCardPattern color={theme.scholar} opacity={0.012} />
              {selectedStory.content.split("\n\n").map((paragraph, i) => (
                <ThemedText
                  key={i}
                  type="body"
                  style={{
                    color: theme.text,
                    lineHeight: 26,
                    marginBottom:
                      i < selectedStory.content.split("\n\n").length - 1
                        ? Spacing.md
                        : 0,
                  }}
                >
                  {paragraph}
                </ThemedText>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <View
              style={[
                styles.moralCard,
                {
                  backgroundColor: catColor.bg,
                  borderColor: catColor.text + "20",
                },
              ]}
            >
              <GeometricCardPattern color={catColor.text} opacity={0.012} />
              <AppIcon name="bookmark" size={20} color={catColor.text} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText
                  type="small"
                  style={{
                    color: catColor.text,
                    fontFamily: Fonts?.sansBold,
                    marginBottom: 4,
                  }}
                >
                  Moral of the Story
                </ThemedText>
                <ThemedText type="body" style={{ color: catColor.text }}>
                  {selectedStory.moral}
                </ThemedText>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            {read ? (
              <Pressable
                onPress={() =>
                  setQuizState({
                    storyId: selectedStory.id,
                    currentQuestion: 0,
                    answers: [null, null],
                    completed: false,
                    score: 0,
                  })
                }
                style={[
                  styles.actionButton,
                  { backgroundColor: catColor.text },
                ]}
                testID="button-take-quiz"
              >
                <AppIcon name="help-circle" size={18} color="#FFFFFF" />
                <Text
                  style={[
                    styles.actionButtonText,
                    { fontFamily: Fonts?.sansBold },
                  ]}
                >
                  Take Quiz
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => handleMarkAsRead(selectedStory)}
                style={[
                  styles.actionButton,
                  { backgroundColor: catColor.text },
                ]}
                testID="button-mark-read"
              >
                <AppIcon name="check" size={18} color="#FFFFFF" />
                <Text
                  style={[
                    styles.actionButtonText,
                    { fontFamily: Fonts?.sansBold },
                  ]}
                >
                  Mark as Read & Take Quiz
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <IslamicPatternBackground color={theme.scholar} opacity={0.006} />
      <LinearGradient
        colors={
          isDark ? ["#2563EB", "transparent"] : ["#DBEAFE", "transparent"]
        }
        style={styles.topGradient}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          testID="button-back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3" accessibilityRole="header">
          Stories
        </ThemedText>
        <Pressable
          onPress={() => navigation.navigate("Settings" as never)}
          style={styles.headerBtn}
          testID="button-settings"
        >
          <AppIcon name="settings" size={22} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_CATEGORIES.map((cat) => {
              const isActive = filterCategory === cat;
              const pillColor =
                cat === "All"
                  ? getColor("blue")
                  : getColor(CATEGORY_COLORS[cat]);
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    setFilterCategory(cat);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isActive
                        ? pillColor.text
                        : theme.surfaceGlass,
                      borderColor: isActive
                        ? pillColor.text
                        : theme.borderSubtle,
                    },
                  ]}
                  testID={`button-filter-${cat}`}
                >
                  {cat !== "All" ? (
                    <AppIcon
                      name={CATEGORY_ICONS[cat] as any}
                      size={14}
                      color={isActive ? "#FFFFFF" : pillColor.text}
                      style={{ marginRight: 4 }}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color: isActive ? "#FFFFFF" : theme.text,
                        fontFamily: Fonts?.sansSemiBold,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.surfaceGlass,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            <AppIcon name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={[
                styles.searchInput,
                { color: theme.text, fontFamily: Fonts?.sans },
              ]}
              placeholder="Search stories"
              placeholderTextColor={theme.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              testID="input-search"
            />
            {searchText.length > 0 ? (
              <Pressable
                onPress={() => setSearchText("")}
                testID="button-clear-search"
              >
                <AppIcon name="x" size={18} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        <View style={{ paddingHorizontal: Spacing.lg }}>
          {filteredStories.length === 0 ? (
            <Animated.View entering={FadeInDown.duration(400)}>
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <QuranIconSvg size={44} color={theme.textMuted} />
                <ThemedText
                  type="body"
                  style={{
                    color: theme.textMuted,
                    marginTop: Spacing.md,
                    textAlign: "center",
                  }}
                >
                  No stories found. Try a different search or category.
                </ThemedText>
              </View>
            </Animated.View>
          ) : (
            filteredStories.map((story, i) => {
              const catColor = getColor(CATEGORY_COLORS[story.category]);
              const read = isStoryRead(story.id);
              const originalIndex = STORIES.indexOf(story);
              const isLocked =
                !isPremium && originalIndex >= FREE_STORIES_COUNT;
              return (
                <Animated.View
                  key={story.id}
                  entering={FadeInDown.delay(150 + i * 60).duration(400)}
                >
                  <Pressable
                    onPress={() => {
                      if (isLocked) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate("Subscription", {
                          initialTab: "premium",
                        });
                      } else {
                        handleStoryPress(story);
                      }
                    }}
                    style={[
                      styles.storyCard,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                        opacity: isLocked ? 0.85 : 1,
                      },
                    ]}
                    testID={`button-story-${story.id}`}
                  >
                    <GeometricCardPattern
                      color={catColor.text}
                      opacity={0.012}
                    />
                    <View
                      style={[
                        styles.storyIcon,
                        { backgroundColor: catColor.bg },
                      ]}
                    >
                      <AppIcon
                        name={story.icon as any}
                        size={22}
                        color={catColor.text}
                      />
                    </View>
                    <View style={styles.storyInfo}>
                      <View style={styles.storyTitleRow}>
                        <ThemedText
                          type="small"
                          style={{ fontFamily: Fonts?.sansSemiBold, flex: 1 }}
                          numberOfLines={1}
                        >
                          {story.title}
                        </ThemedText>
                        {isLocked ? (
                          <PremiumBadge tier="premium" />
                        ) : read ? (
                          <AppIcon
                            name="check-circle"
                            size={16}
                            color={getColor("emerald").text}
                          />
                        ) : null}
                      </View>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary, marginTop: 2 }}
                        numberOfLines={2}
                      >
                        {story.brief}
                      </ThemedText>
                      <View style={styles.storyBadges}>
                        <View
                          style={[
                            styles.categoryBadge,
                            { backgroundColor: catColor.bg },
                          ]}
                        >
                          <ThemedText
                            type="caption"
                            style={{
                              color: catColor.text,
                              fontSize: 10,
                              fontFamily: Fonts?.sansSemiBold,
                            }}
                          >
                            {story.category}
                          </ThemedText>
                        </View>
                        {story.ageGroups.map((age) => (
                          <View
                            key={age}
                            style={[
                              styles.ageBadge,
                              {
                                backgroundColor: isDark
                                  ? theme.backgroundTertiary
                                  : theme.backgroundSecondary,
                              },
                            ]}
                          >
                            <ThemedText
                              type="caption"
                              style={{ color: theme.textMuted, fontSize: 10 }}
                            >
                              {age}
                            </ThemedText>
                          </View>
                        ))}
                        <View
                          style={[
                            styles.ageBadge,
                            {
                              backgroundColor: isDark
                                ? theme.backgroundTertiary
                                : theme.backgroundSecondary,
                            },
                          ]}
                        >
                          <AppIcon
                            name="clock"
                            size={10}
                            color={theme.textMuted}
                          />
                          <ThemedText
                            type="caption"
                            style={{
                              color: theme.textMuted,
                              fontSize: 10,
                              marginLeft: 2,
                            }}
                          >
                            {story.readTime}m
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                    <AppIcon
                      name={isLocked ? "lock" : "chevron-right"}
                      size={18}
                      color={theme.textMuted}
                    />
                  </Pressable>
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 13 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  storyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    overflow: "hidden",
  },
  storyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  storyInfo: { flex: 1 },
  storyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  storyBadges: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  ageBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginTop: Spacing.lg,
    overflow: "hidden",
  },
  storyHero: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  storyDivider: { width: "72%", marginTop: Spacing.md },
  storyMeta: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "transparent",
  },
  storyContentCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  moralCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButtonText: { color: "#FFFFFF", fontSize: 16 },
  quizCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  quizProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  quizProgressFill: { height: 6, borderRadius: 3 },
  quizOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  quizOptionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quizOptionLetterText: { fontSize: 14 },
  quizResultCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: "center",
    marginTop: Spacing.xl,
    overflow: "hidden",
  },
  scoreBadge: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.lg,
  },
});
