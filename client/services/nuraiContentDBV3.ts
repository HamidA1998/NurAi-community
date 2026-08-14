export interface QuranContext {
  surah: number;
  ayah: number;
  arabic?: string;
  translation: string;
  context: string;
  reflection: string;
  category: string;
}

export interface DailyMotivation {
  id: number;
  text: string;
  source: string;
  sourceUrl?: string;
  category: string;
}

const QURAN_CONTEXTS: QuranContext[] = [
  {
    surah: 2,
    ayah: 45,
    translation: "And seek help through patience and prayer...",
    context:
      "Allah pairs patience with prayer as the two greatest tools for hardship.",
    reflection:
      "What are you being patient about today? Bring it to your prayer.",
    category: "patience",
  },
  {
    surah: 2,
    ayah: 152,
    translation: "Remember Me and I will remember you.",
    context:
      "A direct promise from Allah \u2014 the Creator of the universe promises to remember you.",
    reflection: "The most personal verse. Your dhikr is heard.",
    category: "dhikr",
  },
  {
    surah: 2,
    ayah: 153,
    translation: "O you who believe, seek help through patience and prayer.",
    context:
      "Repeated emphasis \u2014 patience and prayer are the believer's weapons.",
    reflection: "In your hardest moment, turn to salah before anything else.",
    category: "prayer",
  },
  {
    surah: 2,
    ayah: 186,
    translation:
      "I am near. I respond to the call of the caller when he calls upon Me.",
    context: "No intermediary needed. Allah is closer than you think.",
    reflection: "Call upon Him right now. He's listening.",
    category: "dua",
  },
  {
    surah: 2,
    ayah: 216,
    translation: "You may dislike something that is good for you...",
    context: "Allah's wisdom surpasses our limited perspective.",
    reflection: "What 'bad' thing turned out to be good for you?",
    category: "trust",
  },
  {
    surah: 2,
    ayah: 255,
    translation:
      "Allah \u2014 there is no deity except Him, the Ever-Living...",
    context: "Ayatul Kursi \u2014 the greatest verse in the Quran.",
    reflection:
      "Recite it with attention after prayer and let its meaning steady you.",
    category: "protection",
  },
  {
    surah: 2,
    ayah: 286,
    translation: "Allah does not burden a soul beyond that it can bear.",
    context:
      "Allah does not place a burden beyond what a soul can bear, even when help and support are needed.",
    reflection: "Name the next small step and ask Allah for strength.",
    category: "hardship",
  },
  {
    surah: 3,
    ayah: 8,
    translation:
      "Our Lord, let not our hearts deviate after You have guided us.",
    context:
      "The Companions feared deviation despite being the best generation.",
    reflection: "Guidance is a daily ask, not a one-time gift.",
    category: "guidance",
  },
  {
    surah: 3,
    ayah: 139,
    translation:
      "Do not weaken and do not grieve, for you are superior if you are believers.",
    context:
      "Said during the aftermath of Uhud \u2014 even in defeat, believers stand tall.",
    reflection:
      "Your faith makes you strong, even when the world says otherwise.",
    category: "strength",
  },
  {
    surah: 3,
    ayah: 159,
    translation: "So pardon them and ask forgiveness for them...",
    context: "The Prophet \uFDFA was told to forgive even those who disobeyed.",
    reflection: "Who needs your forgiveness today?",
    category: "forgiveness",
  },
  {
    surah: 3,
    ayah: 200,
    translation:
      "O you who believe, be patient, persevere, remain stationed, and fear Allah.",
    context: "Four commands in one verse \u2014 the formula for success.",
    reflection: "Patience + perseverance + readiness + taqwa = victory.",
    category: "patience",
  },
  {
    surah: 4,
    ayah: 29,
    translation: "Do not kill yourselves. Indeed, Allah is Merciful to you.",
    context: "Islam preserves life and mental health as sacred.",
    reflection: "Your life matters. Seek qualified help when you need it.",
    category: "mercy",
  },
  {
    surah: 5,
    ayah: 32,
    translation:
      "Whoever saves a life, it is as if he has saved all of humanity.",
    context: "The value of a single life in Islam.",
    reflection: "Your kindness today could save someone.",
    category: "compassion",
  },
  {
    surah: 9,
    ayah: 51,
    translation: "Nothing will befall us except what Allah has decreed for us.",
    context: "A reminder to meet uncertainty with trust in Allah's decree.",
    reflection: "Hold the worry gently, then return to what you can do.",
    category: "trust",
  },
  {
    surah: 12,
    ayah: 86,
    translation: "I only complain of my grief to Allah...",
    context: "Ya'qub's model \u2014 grieve, but direct it to Allah.",
    reflection: "It's okay to feel pain. Take it to the One who heals.",
    category: "grief",
  },
  {
    surah: 12,
    ayah: 87,
    translation: "Do not despair of the mercy of Allah.",
    context: "Allah teaches His servants not to despair of His mercy.",
    reflection: "No matter what you've done, Allah's mercy is bigger.",
    category: "hope",
  },
  {
    surah: 13,
    ayah: 28,
    translation: "Verily, in the remembrance of Allah do hearts find rest.",
    context:
      "The Quran connects remembrance of Allah with steadiness of the heart.",
    reflection: "Pause for a short dhikr and notice what it softens.",
    category: "dhikr",
  },
  {
    surah: 14,
    ayah: 7,
    translation: "If you are grateful, I will surely increase you.",
    context: "Gratitude is the key to increase in everything.",
    reflection: "Name 3 things you're grateful for right now.",
    category: "gratitude",
  },
  {
    surah: 16,
    ayah: 97,
    translation:
      "Whoever does righteousness, male or female, We will give them a good life.",
    context: "The promise of a good life isn't wealth \u2014 it's contentment.",
    reflection: "True success is inner peace, not outer achievement.",
    category: "purpose",
  },
  {
    surah: 17,
    ayah: 23,
    translation:
      "And your Lord has decreed that you worship none but Him, and goodness to parents.",
    context: "Parents come right after the worship of Allah.",
    reflection: "When did you last make dua for your parents?",
    category: "family",
  },
  {
    surah: 18,
    ayah: 10,
    translation: "Our Lord, grant us from Yourself mercy...",
    context: "Dua of the people of the cave \u2014 asking for a way out.",
    reflection: "Trapped in a problem? Ask Allah for mercy and a wise way out.",
    category: "dua",
  },
  {
    surah: 20,
    ayah: 14,
    translation: "And establish prayer for My remembrance.",
    context: "Prayer's purpose isn't just obligation \u2014 it's connection.",
    reflection:
      "In your next salah, talk to Him like He's listening. Because He is.",
    category: "prayer",
  },
  {
    surah: 21,
    ayah: 87,
    translation:
      "There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.",
    context: "Yunus' dua from inside the whale before Allah relieved him.",
    reflection: "When life feels dark, return to this dua with humility.",
    category: "repentance",
  },
  {
    surah: 23,
    ayah: 115,
    translation: "Did you think that We created you uselessly?",
    context: "Your existence has purpose. You are here intentionally.",
    reflection: "You were created for a reason. Live like it.",
    category: "purpose",
  },
  {
    surah: 24,
    ayah: 35,
    translation: "Allah is the Light of the heavens and the earth.",
    context: "The famous Light Verse \u2014 Allah illuminates everything.",
    reflection: "When life feels dark, remember where the light comes from.",
    category: "light",
  },
  {
    surah: 25,
    ayah: 70,
    translation:
      "Except for those who repent, believe, and do righteous work...",
    context: "Allah replaces sins with good deeds for those who change.",
    reflection: "Your past doesn't define you. Your repentance does.",
    category: "repentance",
  },
  {
    surah: 29,
    ayah: 69,
    translation: "And those who strive for Us, We will guide them to Our ways.",
    context:
      "The Quran links sincere striving with being guided to Allah's ways.",
    reflection: "Choose one sincere effort you can make today.",
    category: "effort",
  },
  {
    surah: 33,
    ayah: 56,
    translation: "Allah sends blessings on the Prophet...",
    context: "Sending salawat is a command from Allah Himself.",
    reflection: "Say it now: Allahumma salli ala Muhammad.",
    category: "prophet",
  },
  {
    surah: 39,
    ayah: 53,
    translation:
      "Say: O My servants who have transgressed against themselves, do not despair of the mercy of Allah.",
    context: "The most hopeful verse. Allah calls sinners 'My servants.'",
    reflection: "He still calls you His servant. Come back.",
    category: "hope",
  },
  {
    surah: 40,
    ayah: 60,
    translation: "Call upon Me; I will respond to you.",
    context: "A direct Quranic promise that Allah responds to sincere dua.",
    reflection: "Don't underestimate the power of your dua.",
    category: "dua",
  },
  {
    surah: 49,
    ayah: 13,
    translation:
      "The most noble of you in the sight of Allah is the most righteous.",
    context: "No racism, no tribalism \u2014 only taqwa matters.",
    reflection: "Your character is your real status.",
    category: "character",
  },
  {
    surah: 55,
    ayah: 13,
    translation: "So which of the favors of your Lord would you deny?",
    context: "Repeated 31 times in Surah Ar-Rahman.",
    reflection: "List the favours. Start counting. You'll lose count.",
    category: "gratitude",
  },
  {
    surah: 57,
    ayah: 4,
    translation: "He is with you wherever you are.",
    context: "Allah's knowledge and nearness is absolute.",
    reflection: "You're never truly alone. Ever.",
    category: "nearness",
  },
  {
    surah: 65,
    ayah: 3,
    translation: "And whoever relies upon Allah, He is sufficient for him.",
    context: "Tawakkul \u2014 the ultimate trust in Allah's plan.",
    reflection: "Do your part, then let go. He's got this.",
    category: "trust",
  },
  {
    surah: 73,
    ayah: 8,
    translation: "And devote yourself to Him with complete devotion.",
    context: "Tabattul \u2014 cutting off everything to focus on Allah.",
    reflection: "Even 5 minutes of pure, undivided worship transforms you.",
    category: "devotion",
  },
  {
    surah: 93,
    ayah: 3,
    translation:
      "Your Lord has not taken leave of you, nor has He detested you.",
    context:
      "Revealed when revelation paused and the Prophet \uFDFA feared abandonment.",
    reflection: "Silence doesn't mean absence. He's still there.",
    category: "comfort",
  },
  {
    surah: 93,
    ayah: 5,
    translation:
      "And your Lord is going to give you, and you will be satisfied.",
    context: "A profound promise of comfort given to the Prophet ﷺ.",
    reflection: "Hold onto hope in Allah's mercy.",
    category: "hope",
  },
  {
    surah: 94,
    ayah: 5,
    translation: "For indeed, with hardship comes ease.",
    context: "Mentioned twice for emphasis: hardship is never the whole story.",
    reflection: "Hold steady; Allah pairs hardship with ease.",
    category: "hardship",
  },
  {
    surah: 94,
    ayah: 6,
    translation: "Indeed, with hardship comes ease.",
    context: "Repeated for reassurance: ease accompanies hardship.",
    reflection: "You're closer to relief than you think.",
    category: "hardship",
  },
  {
    surah: 112,
    ayah: 1,
    translation: "Say: He is Allah, the One.",
    context:
      "A concise surah that teaches the oneness and uniqueness of Allah.",
    reflection: "Recite it slowly and let tawhid become simple and clear.",
    category: "tawhid",
  },
];

const DAILY_MOTIVATIONS: DailyMotivation[] = [
  {
    id: 1,
    text: "Seek help through patience and prayer.",
    source: "Quran 2:45",
    category: "consistency",
  },
  {
    id: 2,
    text: "Remember Me and I will remember you.",
    source: "Quran 2:152",
    category: "prayer",
  },
  {
    id: 3,
    text: "Allah does not burden a soul beyond what it can bear.",
    source: "Quran 2:286",
    category: "kindness",
  },
  {
    id: 4,
    text: "Do not weaken and do not grieve.",
    source: "Quran 3:139",
    category: "strength",
  },
  {
    id: 5,
    text: "Pardon them and ask forgiveness for them.",
    source: "Quran 3:159",
    category: "speech",
  },
  {
    id: 6,
    text: "Be patient, persevere, remain stationed, and fear Allah.",
    source: "Quran 3:200",
    category: "ease",
  },
  {
    id: 7,
    text: "Allah loves those who purify themselves.",
    source: "Quran 2:222",
    category: "purification",
  },
  {
    id: 8,
    text: "Be good to parents.",
    source: "Quran 17:23",
    category: "brotherhood",
  },
  {
    id: 9,
    text: "The life of this world is only the enjoyment of delusion.",
    source: "Quran 3:185",
    category: "perspective",
  },
  {
    id: 10,
    text: "Read in the name of your Lord who created.",
    source: "Quran 96:1",
    category: "knowledge",
  },
  {
    id: 11,
    text: "We have made the Quran easy for remembrance.",
    source: "Quran 54:17",
    category: "quran",
  },
  {
    id: 12,
    text: "With Allah is the best return.",
    source: "Quran 3:14",
    category: "detachment",
  },
  {
    id: 13,
    text: "Seek help through patience and prayer.",
    source: "Quran 2:153",
    category: "patience",
  },
  {
    id: 14,
    text: "If you are grateful, I will surely increase you.",
    source: "Quran 14:7",
    category: "gratitude",
  },
  {
    id: 15,
    text: "Spend from the good things you have earned.",
    source: "Quran 2:267",
    category: "charity",
  },
  {
    id: 16,
    text: "Tell the believing men and women to guard their gaze.",
    source: "Quran 24:30-31",
    category: "character",
  },
  {
    id: 17,
    text: "Those who restrain anger and pardon people are loved by Allah.",
    source: "Quran 3:134",
    category: "anger",
  },
  {
    id: 18,
    text: "Whoever saves a life, it is as if they saved all humanity.",
    source: "Quran 5:32",
    category: "compassion",
  },
  {
    id: 19,
    text: "Ask Allah to increase you in knowledge.",
    source: "Quran 20:114",
    category: "knowledge",
  },
  {
    id: 20,
    text: "Those who strive for Us, We will guide them to Our ways.",
    source: "Quran 29:69",
    category: "self",
  },
  {
    id: 21,
    text: "Establish prayer for My remembrance.",
    source: "Quran 20:14",
    category: "prayer",
  },
  {
    id: 22,
    text: "Speak to people good words.",
    source: "Quran 2:83",
    category: "speech",
  },
  {
    id: 23,
    text: "The most noble of you in Allah's sight is the most righteous.",
    source: "Quran 49:13",
    category: "sincerity",
  },
  {
    id: 24,
    text: "In the remembrance of Allah do hearts find rest.",
    source: "Quran 13:28",
    category: "dhikr",
  },
  {
    id: 25,
    text: "Whoever relies upon Allah, He is sufficient for him.",
    source: "Quran 65:3",
    category: "action",
  },
  {
    id: 26,
    text: "Cooperate in righteousness and taqwa.",
    source: "Quran 5:2",
    category: "helping",
  },
  {
    id: 27,
    text: "If they incline to peace, incline to it.",
    source: "Quran 8:61",
    category: "peace",
  },
  {
    id: 28,
    text: "Invite to the way of your Lord with wisdom.",
    source: "Quran 16:125",
    category: "dawah",
  },
  {
    id: 29,
    text: "Do not throw yourselves into destruction.",
    source: "Quran 2:195",
    category: "health",
  },
  {
    id: 30,
    text: "The believers are but brothers, so make peace between them.",
    source: "Quran 49:10",
    category: "brotherhood",
  },
  {
    id: 31,
    text: "Begin the day by renewing your intention.",
    source: "Sahih al-Bukhari 1",
    sourceUrl: "https://sunnah.com/bukhari:1",
    category: "sincerity",
  },
  {
    id: 32,
    text: "Let your tongue and hands be safe for others.",
    source: "Sahih al-Bukhari 10",
    sourceUrl: "https://sunnah.com/bukhari:10",
    category: "speech",
  },
  {
    id: 33,
    text: "Real strength shows when anger rises and you restrain it.",
    source: "Sahih al-Bukhari 6114",
    sourceUrl: "https://sunnah.com/bukhari:6114",
    category: "anger",
  },
  {
    id: 34,
    text: "Make dua part of the work, not only the worry.",
    source: "Jami at-Tirmidhi 3372",
    sourceUrl: "https://sunnah.com/tirmidhi:3372",
    category: "dua",
  },
  {
    id: 35,
    text: "Walk one step on the path of beneficial knowledge.",
    source: "Sahih Muslim 2699",
    sourceUrl: "https://sunnah.com/muslim:2699",
    category: "knowledge",
  },
];

function dailySeed(salt: string = ""): number {
  const today = new Date().toISOString().split("T")[0] + salt;
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash << 5) - hash + today.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededPick<T>(arr: T[], salt: string = ""): T {
  return arr[dailySeed(salt) % arr.length];
}

export function getQuranContext(
  surah: number,
  ayah: number,
): QuranContext | null {
  return (
    QURAN_CONTEXTS.find((q) => q.surah === surah && q.ayah === ayah) || null
  );
}

export function getQuranContextByCategory(category: string): QuranContext[] {
  return QURAN_CONTEXTS.filter((q) => q.category === category);
}

export function getRandomQuranContext(): QuranContext {
  return seededPick(QURAN_CONTEXTS, "quran");
}

export function getContextForEmotion(emotion: string): QuranContext {
  const map: Record<string, string[]> = {
    struggling: ["hardship", "hope", "patience", "comfort"],
    grieving: ["grief", "hope", "mercy", "comfort"],
    anxious: ["dhikr", "trust", "protection", "nearness"],
    celebrating: ["gratitude", "purpose", "light"],
    returning: ["repentance", "hope", "mercy"],
    contemplative: ["devotion", "purpose", "nearness", "tawhid"],
    motivated: ["effort", "strength", "purpose"],
    coasting: ["effort", "purpose", "character"],
    exploring: ["guidance", "light", "effort"],
    deepening: ["devotion", "nearness", "tawhid"],
    neutral: ["gratitude", "dhikr", "prayer"],
    ramadan_mode: ["patience", "gratitude", "effort"],
  };
  const cats = map[emotion] || map.neutral;
  const pool = QURAN_CONTEXTS.filter((q) => cats.includes(q.category));
  return pool.length > 0
    ? seededPick(pool, "emo_" + emotion)
    : getRandomQuranContext();
}

export function getDailyMotivation(dayOfYear?: number): DailyMotivation {
  const d =
    dayOfYear ??
    Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        86400000,
    );
  return DAILY_MOTIVATIONS[d % DAILY_MOTIVATIONS.length];
}

export function getMotivationByCategory(
  category: string,
): DailyMotivation | null {
  const pool = DAILY_MOTIVATIONS.filter((m) => m.category === category);
  return pool.length > 0 ? seededPick(pool, "mot_" + category) : null;
}

export const TOTAL_QURAN_CONTEXTS = QURAN_CONTEXTS.length;
export const TOTAL_MOTIVATIONS = DAILY_MOTIVATIONS.length;
