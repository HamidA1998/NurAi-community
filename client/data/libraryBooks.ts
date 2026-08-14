import type {
  Book,
  BookCoverMotif,
  Chapter,
  LibraryReviewEvidence,
  LibraryCategory,
  PlanType,
  SourceRef,
  VerifiedContentStatus,
} from "@/types/library";

const NURAI_BOOK_AUTHOR = "NurAI AI with Hamid Amjad";
const NURAI_BOOK_PROVENANCE = "AI-assisted in-app original";
const NURAI_CONTENT_ORIGIN: Book["contentOrigin"] = "nurai_exclusive_original";

type VerifiedSourceKey =
  | "fatihahWhole"
  | "fatihahHelp"
  | "fatihahStraightPath"
  | "purpose"
  | "capacity"
  | "dhikrHeart"
  | "prayer"
  | "salahPrevents"
  | "repentance"
  | "sabr"
  | "tawakkul"
  | "parents"
  | "marriage"
  | "familyKindness"
  | "backbiting"
  | "gaze"
  | "fasting"
  | "hajj"
  | "zakat"
  | "charity"
  | "children"
  | "luqmanParenting"
  | "qadrNight"
  | "dawah"
  | "dialogue"
  | "womenFaith"
  | "wudu"
  | "quranRecitation"
  | "readCommand"
  | "quranEase"
  | "hope"
  | "death"
  | "lifeTest"
  | "time"
  | "dunyaAkhirah"
  | "anger"
  | "propheticExample"
  | "khushuBelievers"
  | "easeAfterHardship"
  | "moderation"
  | "verifyNews"
  | "believerBrotherhood"
  | "humanDignity"
  | "justiceExcellence"
  | "consultation"
  | "fulfilContracts"
  | "tradeConsent"
  | "hiddenPublicCharity"
  | "duaNear"
  | "holdFast"
  | "bestCommunity"
  | "familyPrayer"
  | "childrenAdornment"
  | "womenMenAllies"
  | "pietyMeasure"
  | "quranTartil"
  | "quranHealing"
  | "repentanceGoodDeeds"
  | "avoidZina"
  | "spendingBalance"
  | "fearAllahAbility"
  | "askKnowledgePeople"
  | "brotherhoodHadith"
  | "tawakkulCamelHadith"
  | "adviceHadith"
  | "intentionHadith"
  | "consistentDeedsHadith"
  | "angerHadith"
  | "duaHadith"
  | "knowledgeHadith"
  | "safeMuslimHadith";

const VERIFIED_SOURCES: Record<VerifiedSourceKey, Omit<SourceRef, "id">> = {
  fatihahWhole: {
    type: "quran",
    reference: "Quran 1:1-7",
    note: "Primary source for Surah Al-Fatihah lessons and salah meaning.",
    verified: true,
    url: "https://quran.com/1",
  },
  fatihahHelp: {
    type: "quran",
    reference: "Quran 1:5",
    note: "Source anchor for worship, reliance on Allah, and seeking help.",
    verified: true,
    url: "https://quran.com/1/5",
  },
  fatihahStraightPath: {
    type: "quran",
    reference: "Quran 1:6",
    note: "Source anchor for guidance, direction, and daily spiritual choices.",
    verified: true,
    url: "https://quran.com/1/6",
  },
  purpose: {
    type: "quran",
    reference: "Quran 51:56",
    note: "Source anchor for purpose, worship, and life direction.",
    verified: true,
    url: "https://quran.com/51/56",
  },
  capacity: {
    type: "quran",
    reference: "Quran 2:286",
    note: "Source anchor for hardship, responsibility, and not overwhelming users.",
    verified: true,
    url: "https://quran.com/2/286",
  },
  dhikrHeart: {
    type: "quran",
    reference: "Quran 13:28",
    note: "Source anchor for remembrance of Allah and steadiness of the heart.",
    verified: true,
    url: "https://quran.com/13/28",
  },
  prayer: {
    type: "quran",
    reference: "Quran 20:14",
    note: "Source anchor for prayer being established for remembrance of Allah.",
    verified: true,
    url: "https://quran.com/20/14",
  },
  salahPrevents: {
    type: "quran",
    reference: "Quran 29:45",
    note: "Source anchor for prayer shaping conduct and protecting the believer.",
    verified: true,
    url: "https://quran.com/29/45",
  },
  repentance: {
    type: "quran",
    reference: "Quran 39:53",
    note: "Source anchor for hope, repentance, and returning to Allah.",
    verified: true,
    url: "https://quran.com/39/53",
  },
  sabr: {
    type: "quran",
    reference: "Quran 2:153",
    note: "Source anchor for seeking help through patience and prayer.",
    verified: true,
    url: "https://quran.com/2/153",
  },
  tawakkul: {
    type: "quran",
    reference: "Quran 65:3",
    note: "Source anchor for reliance on Allah while taking responsible action.",
    verified: true,
    url: "https://quran.com/65/3",
  },
  parents: {
    type: "quran",
    reference: "Quran 17:23-24",
    note: "Source anchor for honouring parents with mercy and adab.",
    verified: true,
    url: "https://quran.com/17/23-24",
  },
  marriage: {
    type: "quran",
    reference: "Quran 30:21",
    note: "Source anchor for mercy, tranquillity, and affection in marriage.",
    verified: true,
    url: "https://quran.com/30/21",
  },
  familyKindness: {
    type: "quran",
    reference: "Quran 4:19",
    note: "Source anchor for kindness and restraint in family relationships.",
    verified: true,
    url: "https://quran.com/4/19",
  },
  backbiting: {
    type: "quran",
    reference: "Quran 49:12",
    note: "Source anchor for guarding speech, suspicion, and backbiting.",
    verified: true,
    url: "https://quran.com/49/12",
  },
  gaze: {
    type: "quran",
    reference: "Quran 24:30-31",
    note: "Source anchor for modesty, gaze, and dignity.",
    verified: true,
    url: "https://quran.com/24/30-31",
  },
  fasting: {
    type: "quran",
    reference: "Quran 2:183",
    note: "Source anchor for fasting and taqwa.",
    verified: true,
    url: "https://quran.com/2/183",
  },
  hajj: {
    type: "quran",
    reference: "Quran 2:197",
    note: "Source anchor for Hajj manners, restraint, and taqwa.",
    verified: true,
    url: "https://quran.com/2/197",
  },
  zakat: {
    type: "quran",
    reference: "Quran 9:60",
    note: "Source anchor for zakat categories and the need for care in zakat topics.",
    verified: true,
    url: "https://quran.com/9/60",
  },
  charity: {
    type: "quran",
    reference: "Quran 2:267",
    note: "Source anchor for giving from good earnings and lawful wealth.",
    verified: true,
    url: "https://quran.com/2/267",
  },
  children: {
    type: "quran",
    reference: "Quran 66:6",
    note: "Source anchor for family responsibility and spiritual protection.",
    verified: true,
    url: "https://quran.com/66/6",
  },
  luqmanParenting: {
    type: "quran",
    reference: "Quran 31:13-19",
    note: "Source anchor for parent-child teaching, worship, humility, and character.",
    verified: true,
    url: "https://quran.com/31/13-19",
  },
  qadrNight: {
    type: "quran",
    reference: "Quran 97:1-5",
    note: "Source anchor for Laylat al-Qadr and the greatness of Ramadan nights.",
    verified: true,
    url: "https://quran.com/97",
  },
  dawah: {
    type: "quran",
    reference: "Quran 16:125",
    note: "Source anchor for inviting with wisdom and beautiful instruction.",
    verified: true,
    url: "https://quran.com/16/125",
  },
  dialogue: {
    type: "quran",
    reference: "Quran 29:46",
    note: "Source anchor for respectful dialogue with people of scripture.",
    verified: true,
    url: "https://quran.com/29/46",
  },
  womenFaith: {
    type: "quran",
    reference: "Quran 33:35",
    note: "Source anchor for Muslim men and women sharing worship, virtue, and reward.",
    verified: true,
    url: "https://quran.com/33/35",
  },
  wudu: {
    type: "quran",
    reference: "Quran 5:6",
    note: "Source anchor for wudu, purification, and prayer preparation.",
    verified: true,
    url: "https://quran.com/5/6",
  },
  quranRecitation: {
    type: "quran",
    reference: "Quran 73:20",
    note: "Source anchor for regular Quran recitation according to ability.",
    verified: true,
    url: "https://quran.com/73/20",
  },
  readCommand: {
    type: "quran",
    reference: "Quran 96:1",
    note: "Source anchor for learning, reading, and seeking knowledge.",
    verified: true,
    url: "https://quran.com/96/1",
  },
  quranEase: {
    type: "quran",
    reference: "Quran 54:17",
    note: "Source anchor for Quran remembrance and structured learning.",
    verified: true,
    url: "https://quran.com/54/17",
  },
  hope: {
    type: "quran",
    reference: "Quran 12:87",
    note: "Source anchor for hope and not despairing of Allah's mercy.",
    verified: true,
    url: "https://quran.com/12/87",
  },
  death: {
    type: "quran",
    reference: "Quran 3:185",
    note: "Source anchor for death, accountability, and the temporary nature of life.",
    verified: true,
    url: "https://quran.com/3/185",
  },
  lifeTest: {
    type: "quran",
    reference: "Quran 67:2",
    note: "Source anchor for life as a test of excellent action.",
    verified: true,
    url: "https://quran.com/67/2",
  },
  time: {
    type: "quran",
    reference: "Quran 103:1-3",
    note: "Source anchor for time, faith, righteous action, truth, and patience.",
    verified: true,
    url: "https://quran.com/103",
  },
  dunyaAkhirah: {
    type: "quran",
    reference: "Quran 2:201",
    note: "Source anchor for seeking good in this life and the Hereafter.",
    verified: true,
    url: "https://quran.com/2/201",
  },
  anger: {
    type: "quran",
    reference: "Quran 3:134",
    note: "Source anchor for restraining anger and pardoning people.",
    verified: true,
    url: "https://quran.com/3/134",
  },
  propheticExample: {
    type: "quran",
    reference: "Quran 33:21",
    note: "Source anchor for learning from the example of the Messenger of Allah ﷺ.",
    verified: true,
    url: "https://quran.com/33/21",
  },
  khushuBelievers: {
    type: "quran",
    reference: "Quran 23:1-2",
    note: "Source anchor for khushu and humility in prayer.",
    verified: true,
    url: "https://quran.com/23/1-2",
  },
  easeAfterHardship: {
    type: "quran",
    reference: "Quran 94:5-6",
    note: "Source anchor for ease with hardship and steady hope.",
    verified: true,
    url: "https://quran.com/94/5-6",
  },
  moderation: {
    type: "quran",
    reference: "Quran 7:31",
    note: "Source anchor for worship, dignity, and avoiding excess.",
    verified: true,
    url: "https://quran.com/7/31",
  },
  verifyNews: {
    type: "quran",
    reference: "Quran 49:6",
    note: "Source anchor for checking claims before acting on them.",
    verified: true,
    url: "https://quran.com/49/6",
  },
  believerBrotherhood: {
    type: "quran",
    reference: "Quran 49:10",
    note: "Source anchor for believer brotherhood and reconciliation.",
    verified: true,
    url: "https://quran.com/49/10",
  },
  humanDignity: {
    type: "quran",
    reference: "Quran 17:70",
    note: "Source anchor for human dignity and honour.",
    verified: true,
    url: "https://quran.com/17/70",
  },
  justiceExcellence: {
    type: "quran",
    reference: "Quran 16:90",
    note: "Source anchor for justice, excellence, family duty, and restraint.",
    verified: true,
    url: "https://quran.com/16/90",
  },
  consultation: {
    type: "quran",
    reference: "Quran 42:38",
    note: "Source anchor for consultation and communal responsibility.",
    verified: true,
    url: "https://quran.com/42/38",
  },
  fulfilContracts: {
    type: "quran",
    reference: "Quran 5:1",
    note: "Source anchor for fulfilling covenants and obligations.",
    verified: true,
    url: "https://quran.com/5/1",
  },
  tradeConsent: {
    type: "quran",
    reference: "Quran 4:29",
    note: "Source anchor for lawful trade, consent, and avoiding wrongful wealth.",
    verified: true,
    url: "https://quran.com/4/29",
  },
  hiddenPublicCharity: {
    type: "quran",
    reference: "Quran 2:274",
    note: "Source anchor for giving privately and publicly.",
    verified: true,
    url: "https://quran.com/2/274",
  },
  duaNear: {
    type: "quran",
    reference: "Quran 2:186",
    note: "Source anchor for Allah's nearness and responding to dua.",
    verified: true,
    url: "https://quran.com/2/186",
  },
  holdFast: {
    type: "quran",
    reference: "Quran 3:103",
    note: "Source anchor for unity and holding firmly together.",
    verified: true,
    url: "https://quran.com/3/103",
  },
  bestCommunity: {
    type: "quran",
    reference: "Quran 3:110",
    note: "Source anchor for communal responsibility and calling to good.",
    verified: true,
    url: "https://quran.com/3/110",
  },
  familyPrayer: {
    type: "quran",
    reference: "Quran 20:132",
    note: "Source anchor for family prayer and patient consistency.",
    verified: true,
    url: "https://quran.com/20/132",
  },
  childrenAdornment: {
    type: "quran",
    reference: "Quran 18:46",
    note: "Source anchor for family, wealth, and what truly endures.",
    verified: true,
    url: "https://quran.com/18/46",
  },
  womenMenAllies: {
    type: "quran",
    reference: "Quran 9:71",
    note: "Source anchor for believing men and women supporting one another in good.",
    verified: true,
    url: "https://quran.com/9/71",
  },
  pietyMeasure: {
    type: "quran",
    reference: "Quran 49:13",
    note: "Source anchor for dignity, diversity, and taqwa as the measure of honour.",
    verified: true,
    url: "https://quran.com/49/13",
  },
  quranTartil: {
    type: "quran",
    reference: "Quran 73:4",
    note: "Source anchor for measured Quran recitation.",
    verified: true,
    url: "https://quran.com/73/4",
  },
  quranHealing: {
    type: "quran",
    reference: "Quran 17:82",
    note: "Source anchor for Quranic mercy and healing.",
    verified: true,
    url: "https://quran.com/17/82",
  },
  repentanceGoodDeeds: {
    type: "quran",
    reference: "Quran 11:114",
    note: "Source anchor for good deeds wiping away bad deeds.",
    verified: true,
    url: "https://quran.com/11/114",
  },
  avoidZina: {
    type: "quran",
    reference: "Quran 17:32",
    note: "Source anchor for protecting chastity and avoiding paths to zina.",
    verified: true,
    url: "https://quran.com/17/32",
  },
  spendingBalance: {
    type: "quran",
    reference: "Quran 25:67",
    note: "Source anchor for balanced spending without waste or miserliness.",
    verified: true,
    url: "https://quran.com/25/67",
  },
  fearAllahAbility: {
    type: "quran",
    reference: "Quran 64:16",
    note: "Source anchor for taqwa according to one's ability.",
    verified: true,
    url: "https://quran.com/64/16",
  },
  askKnowledgePeople: {
    type: "quran",
    reference: "Quran 16:43",
    note: "Source anchor for asking people of knowledge when one does not know.",
    verified: true,
    url: "https://quran.com/16/43",
  },
  brotherhoodHadith: {
    type: "hadith",
    reference: "Sahih al-Bukhari 13",
    note: "Source anchor for loving for one's brother what one loves for oneself.",
    verified: true,
    url: "https://sunnah.com/bukhari:13",
  },
  tawakkulCamelHadith: {
    type: "hadith",
    reference: "Jami at-Tirmidhi 2517",
    note: "Source anchor for tying one's camel while relying on Allah.",
    verified: true,
    url: "https://sunnah.com/tirmidhi:2517",
  },
  adviceHadith: {
    type: "hadith",
    reference: "Sahih Muslim 55a",
    note: "Source anchor for sincere counsel and religious responsibility.",
    verified: true,
    url: "https://sunnah.com/muslim:55a",
  },
  intentionHadith: {
    type: "hadith",
    reference: "Sahih al-Bukhari 1",
    note: "Source anchor for intention and the inner purpose behind actions.",
    verified: true,
    url: "https://sunnah.com/bukhari:1",
  },
  consistentDeedsHadith: {
    type: "hadith",
    reference: "Sahih al-Bukhari 6464",
    note: "Source anchor for protecting small, regular deeds.",
    verified: true,
    url: "https://sunnah.com/bukhari:6464",
  },
  angerHadith: {
    type: "hadith",
    reference: "Sahih al-Bukhari 6114",
    note: "Source anchor for strength being connected to self-control during anger.",
    verified: true,
    url: "https://sunnah.com/bukhari:6114",
  },
  duaHadith: {
    type: "hadith",
    reference: "Jami at-Tirmidhi 3372",
    note: "Source anchor for dua as worship.",
    verified: true,
    url: "https://sunnah.com/tirmidhi:3372",
  },
  knowledgeHadith: {
    type: "hadith",
    reference: "Sahih Muslim 2699a",
    note: "Source anchor for seeking knowledge and paths of goodness.",
    verified: true,
    url: "https://sunnah.com/muslim:2699a",
  },
  safeMuslimHadith: {
    type: "hadith",
    reference: "Sahih al-Bukhari 10",
    note: "Source anchor for guarding the tongue and hand from harming others.",
    verified: true,
    url: "https://sunnah.com/bukhari:10",
  },
};

function verifiedSource(
  key: VerifiedSourceKey,
  ownerId: string,
  index: number,
  chapterFocus?: string,
): SourceRef {
  const source = VERIFIED_SOURCES[key];
  return {
    id: `${ownerId}-${key}-${index}`,
    ...source,
    note: chapterFocus
      ? `${source.note} Chapter focus: ${chapterFocus}.`
      : source.note,
  };
}

const CHAPTER_SOURCE_HINTS: [string, VerifiedSourceKey[]][] = [
  ["why al-fatihah opens", ["fatihahWhole", "readCommand", "prayer"]],
  ["names of mercy", ["fatihahWhole", "fatihahHelp", "hope"]],
  ["worship and seeking help", ["fatihahHelp", "purpose", "tawakkul"]],
  ["straight path", ["fatihahStraightPath", "dawah", "dialogue"]],
  ["how quranic arabic works", ["quranEase", "knowledgeHadith", "readCommand"]],
  ["words of salah", ["prayer", "fatihahHelp", "quranRecitation"]],
  ["roots and patterns", ["quranEase", "readCommand", "fatihahWhole"]],
  [
    "reading with meaning",
    ["quranRecitation", "knowledgeHadith", "fatihahWhole"],
  ],
  ["what a root reveals", ["quranEase", "readCommand", "knowledgeHadith"]],
  ["mercy and guidance roots", ["hope", "fatihahStraightPath", "quranEase"]],
  ["worship and obedience roots", ["purpose", "prayer", "fatihahHelp"]],
  [
    "root notebook",
    ["knowledgeHadith", "consistentDeedsHadith", "readCommand"],
  ],
  ["arrive before you begin", ["prayer", "dhikrHeart", "intentionHadith"]],
  ["understand what you say", ["prayer", "fatihahWhole", "knowledgeHadith"]],
  ["guard the first takbir", ["prayer", "dhikrHeart", "consistentDeedsHadith"]],
  ["after salah reflection", ["salahPrevents", "prayer", "intentionHadith"]],
  ["why purification matters", ["wudu", "prayer", "purpose"]],
  ["wudu step by step", ["wudu", "knowledgeHadith", "prayer"]],
  ["common mistakes", ["wudu", "prayer", "capacity"]],
  ["when to ask a scholar", ["knowledgeHadith", "readCommand", "wudu"]],
  ["wake with intention", ["intentionHadith", "time", "prayer"]],
  ["fajr as anchor", ["prayer", "time", "dhikrHeart"]],
  [
    "ten minutes of quran",
    ["quranRecitation", "quranEase", "consistentDeedsHadith"],
  ],
  ["plan your amanah", ["time", "intentionHadith", "dunyaAkhirah"]],
  [
    "start quitting by naming the loop",
    ["capacity", "repentance", "intentionHadith"],
  ],
  ["name the loop", ["capacity", "repentance", "intentionHadith"]],
  ["remove the trigger", ["capacity", "gaze", "repentance"]],
  ["replace the reward", ["repentance", "consistentDeedsHadith", "dhikrHeart"]],
  ["return after slips", ["repentance", "hope", "capacity"]],
  ["dua is worship", ["duaHadith", "purpose", "fatihahHelp"]],
  ["ask with presence", ["duaHadith", "dhikrHeart", "tawakkul"]],
  ["tie the camel", ["tawakkul", "capacity", "intentionHadith"]],
  ["answer takes time", ["hope", "tawakkul", "sabr"]],
  ["remember before the noise", ["dhikrHeart", "time", "intentionHadith"]],
  [
    "morning and evening anchors",
    ["dhikrHeart", "consistentDeedsHadith", "prayer"],
  ],
  ["dhikr under pressure", ["dhikrHeart", "sabr", "capacity"]],
  ["personal wird", ["dhikrHeart", "consistentDeedsHadith", "knowledgeHadith"]],
  ["mercy before ego", ["marriage", "familyKindness", "anger"]],
  [
    "listening without winning",
    ["familyKindness", "safeMuslimHadith", "anger"],
  ],
  ["rights need knowledge", ["knowledgeHadith", "marriage", "capacity"]],
  ["when to seek help", ["knowledgeHadith", "capacity", "sabr"]],
  [
    "model before you teach",
    ["children", "propheticExample", "luqmanParenting"],
  ],
  ["make salah familiar", ["children", "prayer", "luqmanParenting"]],
  [
    "stories and character",
    ["luqmanParenting", "propheticExample", "safeMuslimHadith"],
  ],
  ["protect without panic", ["children", "capacity", "familyKindness"]],
  [
    "truthfulness in small things",
    ["intentionHadith", "safeMuslimHadith", "propheticExample"],
  ],
  ["guarding the tongue", ["backbiting", "safeMuslimHadith", "angerHadith"]],
  ["humility in wins", ["propheticExample", "dunyaAkhirah", "intentionHadith"]],
  [
    "reliability as worship",
    ["safeMuslimHadith", "intentionHadith", "consistentDeedsHadith"],
  ],
  ["controlling the first heat", ["anger", "angerHadith", "capacity"]],
  ["notice the heat", ["anger", "angerHadith", "capacity"]],
  ["pause the tongue", ["angerHadith", "safeMuslimHadith", "backbiting"]],
  ["repair quickly", ["repentance", "anger", "familyKindness"]],
  ["cooler environment", ["capacity", "anger", "consistentDeedsHadith"]],
  ["rizq and effort", ["charity", "dunyaAkhirah", "intentionHadith"]],
  ["integrity at work", ["safeMuslimHadith", "charity", "propheticExample"]],
  ["avoiding doubtful paths", ["knowledgeHadith", "capacity", "charity"]],
  ["giving from what you love", ["charity", "zakat", "dunyaAkhirah"]],
  ["intention in enterprise", ["intentionHadith", "charity", "dunyaAkhirah"]],
  ["fair contracts", ["knowledgeHadith", "charity", "safeMuslimHadith"]],
  ["customer trust", ["safeMuslimHadith", "propheticExample", "charity"]],
  ["profit and accountability", ["dunyaAkhirah", "zakat", "lifeTest"]],
  ["welcome to islam", ["purpose", "intentionHadith", "prayer"]],
  ["what to learn first", ["knowledgeHadith", "readCommand", "prayer"]],
  [
    "first steps in prayer",
    ["prayer", "salahPrevents", "consistentDeedsHadith"],
  ],
  ["family and community pressure", ["capacity", "familyKindness", "sabr"]],
  ["lower the temperature", ["dawah", "dialogue", "anger"]],
  ["explaining with simplicity", ["dawah", "knowledgeHadith", "dialogue"]],
  ["answer with simplicity", ["dawah", "knowledgeHadith", "dialogue"]],
  ["respect without compromise", ["dialogue", "capacity", "safeMuslimHadith"]],
  ["when silence is wise", ["safeMuslimHadith", "dialogue", "backbiting"]],
  ["prepare the heart", ["fasting", "sabr", "intentionHadith"]],
  [
    "design your quran plan",
    ["quranRecitation", "quranEase", "consistentDeedsHadith"],
  ],
  ["charity and dua", ["charity", "duaHadith", "dunyaAkhirah"]],
  ["last ten nights", ["qadrNight", "quranRecitation", "duaHadith"]],
  ["protect the nights", ["qadrNight", "time", "consistentDeedsHadith"]],
  ["dua list that matters", ["duaHadith", "qadrNight", "tawakkul"]],
  ["quran and qiyam", ["quranRecitation", "prayer", "qadrNight"]],
  ["eid without spiritual drop", ["consistentDeedsHadith", "time", "fasting"]],
  [
    "choose a sustainable pace",
    ["quranEase", "capacity", "consistentDeedsHadith"],
  ],
  [
    "listen before memorising",
    ["quranRecitation", "knowledgeHadith", "quranEase"],
  ],
  [
    "review more than you add",
    ["quranEase", "consistentDeedsHadith", "quranRecitation"],
  ],
  ["track weak ayat", ["quranRecitation", "capacity", "knowledgeHadith"]],
  ["diagnose weakness", ["quranRecitation", "knowledgeHadith", "capacity"]],
  ["spaced repetition", ["consistentDeedsHadith", "quranEase", "capacity"]],
  ["mistake logs", ["knowledgeHadith", "quranEase", "quranRecitation"]],
  [
    "monthly khatm review",
    ["quranRecitation", "consistentDeedsHadith", "time"],
  ],
  ["shortness of life", ["death", "lifeTest", "time"]],
  ["repentance today", ["repentance", "death", "hope"]],
  ["akhirah in decisions", ["death", "dunyaAkhirah", "lifeTest"]],
  ["leaving good behind", ["death", "charity", "dunyaAkhirah"]],
  ["what are you building", ["purpose", "lifeTest", "dunyaAkhirah"]],
  ["ambition as amanah", ["intentionHadith", "dunyaAkhirah", "purpose"]],
  ["status and sincerity", ["intentionHadith", "time", "lifeTest"]],
  ["measure what lasts", ["death", "dunyaAkhirah", "time"]],
  ["attention trap", ["time", "gaze", "intentionHadith"]],
  ["comparison and envy", ["backbiting", "capacity", "dunyaAkhirah"]],
  ["lowering the gaze online", ["gaze", "backbiting", "capacity"]],
  ["cleaner feed", ["gaze", "time", "consistentDeedsHadith"]],
  ["lowering the first trigger", ["gaze", "capacity", "intentionHadith"]],
  ["understand the trigger", ["gaze", "capacity", "intentionHadith"]],
  ["design friction", ["gaze", "capacity", "consistentDeedsHadith"]],
  ["return without despair", ["repentance", "hope", "gaze"]],
  ["protect the heart", ["dhikrHeart", "gaze", "salahPrevents"]],
  ["name the weight", ["sabr", "capacity", "hope"]],
  ["sabr is active", ["sabr", "prayer", "capacity"]],
  ["tawakkul with action", ["tawakkul", "capacity", "intentionHadith"]],
  ["support", ["capacity", "knowledgeHadith", "sabr"]],
  ["do not delay return", ["repentance", "hope", "intentionHadith"]],
  ["regret without despair", ["repentance", "hope", "capacity"]],
  [
    "repair what you can",
    ["repentance", "safeMuslimHadith", "intentionHadith"],
  ],
  ["build protection", ["repentance", "capacity", "consistentDeedsHadith"]],
  ["honour is worship", ["parents", "familyKindness", "purpose"]],
  ["boundaries with adab", ["familyKindness", "capacity", "safeMuslimHadith"]],
  ["dua for family", ["parents", "duaHadith", "familyKindness"]],
  ["harm needs help", ["capacity", "knowledgeHadith", "familyKindness"]],
  ["know who you are", ["purpose", "propheticExample", "intentionHadith"]],
  ["fit in without disappearing", ["capacity", "safeMuslimHadith", "purpose"]],
  ["answer questions calmly", ["dawah", "dialogue", "safeMuslimHadith"]],
  ["muslim excellence", ["propheticExample", "safeMuslimHadith", "lifeTest"]],
  ["what muslims believe", ["purpose", "dawah", "dialogue"]],
  ["what is the quran", ["quranRecitation", "readCommand", "knowledgeHadith"]],
  ["why muslims pray", ["prayer", "purpose", "salahPrevents"]],
  ["visit a mosque", ["dialogue", "prayer", "safeMuslimHadith"]],
  ["dignity and worship", ["womenFaith", "purpose", "propheticExample"]],
  [
    "learning before assumptions",
    ["womenFaith", "knowledgeHadith", "dialogue"],
  ],
  ["common questions", ["womenFaith", "dialogue", "capacity"]],
  ["scholar is needed", ["knowledgeHadith", "readCommand", "womenFaith"]],
  ["before you pray", ["wudu", "prayer", "intentionHadith"]],
  ["shape of salah", ["prayer", "salahPrevents", "knowledgeHadith"]],
  ["what you say", ["fatihahWhole", "prayer", "quranRecitation"]],
  ["first week", ["consistentDeedsHadith", "prayer", "capacity"]],
  [
    "voluntary worship matters",
    ["prayer", "consistentDeedsHadith", "intentionHadith"],
  ],
  ["start with two rak", ["prayer", "capacity", "consistentDeedsHadith"]],
  ["protect witr", ["prayer", "knowledgeHadith", "consistentDeedsHadith"]],
  ["grow slowly", ["capacity", "consistentDeedsHadith", "intentionHadith"]],
  ["words feel heavy", ["duaHadith", "hope", "capacity"]],
  ["ask for strength", ["duaHadith", "tawakkul", "capacity"]],
  ["dua and action", ["duaHadith", "tawakkul", "intentionHadith"]],
  ["hope after delay", ["hope", "sabr", "tawakkul"]],
  ["give before it feels easy", ["charity", "intentionHadith", "dunyaAkhirah"]],
  ["small daily charity", ["charity", "consistentDeedsHadith", "capacity"]],
  ["serve with time", ["charity", "time", "safeMuslimHadith"]],
  [
    "make giving automatic",
    ["charity", "consistentDeedsHadith", "dunyaAkhirah"],
  ],
  ["what zakat purifies", ["zakat", "charity", "dunyaAkhirah"]],
  ["assets and debts", ["zakat", "charity", "capacity"]],
  ["nisab and hawl", ["zakat", "readCommand", "knowledgeHadith"]],
  ["complex cases need scholars", ["zakat", "knowledgeHadith", "dunyaAkhirah"]],
  ["intention before travel", ["intentionHadith", "hajj", "dunyaAkhirah"]],
  ["learn the rites", ["hajj", "knowledgeHadith", "readCommand"]],
  ["patience in crowds", ["hajj", "sabr", "anger"]],
  ["returning changed", ["hajj", "repentance", "consistentDeedsHadith"]],
  [
    "why seerah matters",
    ["propheticExample", "readCommand", "knowledgeHadith"],
  ],
  ["mercy under pressure", ["propheticExample", "anger", "familyKindness"]],
  [
    "trust and truthfulness",
    ["safeMuslimHadith", "propheticExample", "intentionHadith"],
  ],
  [
    "carry the sunnah",
    ["propheticExample", "consistentDeedsHadith", "safeMuslimHadith"],
  ],
  [
    "never quote carelessly",
    ["knowledgeHadith", "safeMuslimHadith", "readCommand"],
  ],
  [
    "from source to practice",
    ["knowledgeHadith", "intentionHadith", "propheticExample"],
  ],
  ["grades and context", ["knowledgeHadith", "capacity", "readCommand"]],
  [
    "hadith habit",
    ["knowledgeHadith", "consistentDeedsHadith", "propheticExample"],
  ],
  ["what fiqh is", ["knowledgeHadith", "readCommand", "capacity"]],
  ["why scholars differ", ["knowledgeHadith", "capacity", "dialogue"]],
  ["madhhab awareness", ["knowledgeHadith", "capacity", "safeMuslimHadith"]],
  ["ask better questions", ["knowledgeHadith", "intentionHadith", "capacity"]],
  ["teach through warmth", ["children", "familyKindness", "propheticExample"]],
  ["allah loves goodness", ["children", "purpose", "safeMuslimHadith"]],
  ["little salah moments", ["children", "prayer", "consistentDeedsHadith"]],
  ["celebrate character", ["children", "propheticExample", "safeMuslimHadith"]],
  [
    "choose good company",
    ["safeMuslimHadith", "backbiting", "propheticExample"],
  ],
  ["serve quietly", ["intentionHadith", "charity", "safeMuslimHadith"]],
  ["avoid backbiting", ["backbiting", "safeMuslimHadith", "intentionHadith"]],
  ["repair brotherhood", ["safeMuslimHadith", "repentance", "familyKindness"]],
  ["study as amanah", ["knowledgeHadith", "time", "intentionHadith"]],
  ["prayer between classes", ["prayer", "time", "salahPrevents"]],
  ["friends and influence", ["safeMuslimHadith", "backbiting", "capacity"]],
  ["exams with tawakkul", ["tawakkul", "capacity", "intentionHadith"]],
  ["quiet power is not passivity", ["sabr", "prayer", "capacity"]],
  ["sabr is not passivity", ["sabr", "prayer", "capacity"]],
  ["hold the tongue", ["safeMuslimHadith", "angerHadith", "backbiting"]],
  ["keep the prayer", ["prayer", "salahPrevents", "sabr"]],
  ["hope while waiting", ["hope", "sabr", "tawakkul"]],
  ["your daily quran companion", ["quranRecitation", "quranTartil", "time"]],
  ["open the mushaf daily", ["quranRecitation", "quranTartil", "time"]],
  [
    "read, listen, and reflect daily",
    ["quranRecitation", "quranEase", "dhikrHeart"],
  ],
  ["read, listen, reflect", ["quranRecitation", "quranEase", "dhikrHeart"]],
  [
    "one quran ayah that changes the day",
    ["quranHealing", "lifeTest", "intentionHadith"],
  ],
  [
    "one ayah that changes the day",
    ["quranHealing", "lifeTest", "intentionHadith"],
  ],
  [
    "companion tafsir question",
    ["askKnowledgePeople", "readCommand", "verifyNews"],
  ],
  [
    "build a tafsir question",
    ["askKnowledgePeople", "readCommand", "verifyNews"],
  ],
  ["daily quran appointment", ["time", "consistentDeedsHadith", "quranTartil"]],
  [
    "protect a quran appointment",
    ["time", "consistentDeedsHadith", "quranTartil"],
  ],
  [
    "quran meaning into action",
    ["quranHealing", "justiceExcellence", "safeMuslimHadith"],
  ],
  [
    "carry the meaning into action",
    ["quranHealing", "justiceExcellence", "safeMuslimHadith"],
  ],
  ["begin with ar-rahman", ["hope", "dhikrHeart", "duaNear"]],
  [
    "call upon allah by his names",
    ["duaHadith", "duaNear", "askKnowledgePeople"],
  ],
  ["names in hardship", ["sabr", "easeAfterHardship", "tawakkul"]],
  ["names in gratitude", ["dhikrHeart", "spendingBalance", "dunyaAkhirah"]],
  [
    "turn knowledge into dua",
    ["knowledgeHadith", "duaHadith", "intentionHadith"],
  ],
  ["prepare before friday", ["prayer", "wudu", "intentionHadith"]],
  ["arrive before the khutbah", ["time", "prayer", "safeMuslimHadith"]],
  ["listen with adab", ["safeMuslimHadith", "knowledgeHadith", "backbiting"]],
  ["dua and salawat", ["duaHadith", "duaNear", "propheticExample"]],
  ["plan the week after jumuah", ["time", "consistentDeedsHadith", "tawakkul"]],
  ["masjid etiquette in allah", ["prayer", "humanDignity", "safeMuslimHadith"]],
  ["enter with respect", ["prayer", "humanDignity", "safeMuslimHadith"]],
  ["cleanliness and quietness", ["safeMuslimHadith", "wudu", "prayer"]],
  ["guard quiet and cleanliness", ["safeMuslimHadith", "wudu", "prayer"]],
  ["community care", ["believerBrotherhood", "safeMuslimHadith", "moderation"]],
  [
    "rows, space, and consideration",
    ["believerBrotherhood", "safeMuslimHadith", "moderation"],
  ],
  ["welcoming new people", ["humanDignity", "pietyMeasure", "dialogue"]],
  ["welcome without staring", ["humanDignity", "pietyMeasure", "dialogue"]],
  [
    "leave the masjid better",
    ["charity", "justiceExcellence", "intentionHadith"],
  ],
  [
    "leave better than you came",
    ["charity", "justiceExcellence", "intentionHadith"],
  ],
  ["audit the scroll", ["time", "verifyNews", "fearAllahAbility"]],
  ["remove the trigger path", ["avoidZina", "gaze", "repentanceGoodDeeds"]],
  [
    "replace the empty minute",
    ["dhikrHeart", "consistentDeedsHadith", "quranTartil"],
  ],
  ["protect salah from notifications", ["prayer", "salahPrevents", "time"]],
  ["build a clean digital rule", ["moderation", "capacity", "verifyNews"]],
  [
    "faith when you feel different",
    ["purpose", "pietyMeasure", "humanDignity"],
  ],
  [
    "friends who shape you",
    ["believerBrotherhood", "safeMuslimHadith", "backbiting"],
  ],
  ["school without losing salah", ["prayer", "time", "capacity"]],
  ["pressure, desire, and boundaries", ["avoidZina", "gaze", "sabr"]],
  [
    "confidence without arrogance",
    ["pietyMeasure", "humanDignity", "moderation"],
  ],
  [
    "begin with character",
    ["propheticExample", "safeMuslimHadith", "pietyMeasure"],
  ],
  ["answer one question well", ["dawah", "dialogue", "knowledgeHadith"]],
  [
    "know what you do not know",
    ["askKnowledgePeople", "verifyNews", "adviceHadith"],
  ],
  ["invite without pressure", ["dawah", "humanDignity", "consultation"]],
  ["follow up with mercy", ["familyKindness", "dialogue", "propheticExample"]],
  ["stories are guidance", ["readCommand", "propheticExample", "lifeTest"]],
  ["courage under rejection", ["sabr", "tawakkul", "dawah"]],
  ["patience in long trials", ["sabr", "easeAfterHardship", "hope"]],
  [
    "mercy after power",
    ["propheticExample", "justiceExcellence", "familyKindness"],
  ],
  [
    "carry the lesson carefully",
    ["knowledgeHadith", "verifyNews", "intentionHadith"],
  ],
  ["remember the destination", ["death", "dunyaAkhirah", "lifeTest"]],
  ["choose what lasts", ["dunyaAkhirah", "spendingBalance", "time"]],
  ["desire and delayed reward", ["sabr", "avoidZina", "hope"]],
  [
    "make home a path to jannah",
    ["familyPrayer", "childrenAdornment", "parents"],
  ],
  ["ask for the highest garden", ["duaHadith", "hope", "death"]],
  [
    "quran reflection journal basics",
    ["askKnowledgePeople", "verifyNews", "quranRecitation"],
  ],
  [
    "reflect without overclaiming",
    ["askKnowledgePeople", "verifyNews", "quranRecitation"],
  ],
  ["journal the ayah", ["quranRecitation", "readCommand", "knowledgeHadith"]],
  [
    "write the ayah and context",
    ["quranRecitation", "readCommand", "knowledgeHadith"],
  ],
  ["quran reflection lesson", ["lifeTest", "intentionHadith", "capacity"]],
  ["name the personal lesson", ["lifeTest", "intentionHadith", "capacity"]],
  [
    "journal reflection into action",
    ["justiceExcellence", "consistentDeedsHadith", "safeMuslimHadith"],
  ],
  [
    "turn reflection into action",
    ["justiceExcellence", "consistentDeedsHadith", "safeMuslimHadith"],
  ],
  ["quran journal notes", ["time", "quranTartil", "askKnowledgePeople"]],
  ["review your quran notes", ["time", "quranTartil", "askKnowledgePeople"]],
  ["make dua before advice", ["duaHadith", "familyKindness", "children"]],
  [
    "model what you ask for",
    ["children", "propheticExample", "safeMuslimHadith"],
  ],
  [
    "a dua list for each child",
    ["familyPrayer", "duaNear", "childrenAdornment"],
  ],
  ["correct with mercy", ["familyKindness", "justiceExcellence", "capacity"]],
  [
    "family worship rhythm",
    ["familyPrayer", "consistentDeedsHadith", "prayer"],
  ],
  ["halal is worship", ["purpose", "tradeConsent", "intentionHadith"]],
  ["read labels carefully", ["verifyNews", "askKnowledgePeople", "capacity"]],
  ["eating out with wisdom", ["moderation", "tradeConsent", "consultation"]],
  [
    "doubtful ingredients",
    ["askKnowledgePeople", "capacity", "fearAllahAbility"],
  ],
  [
    "when to ask a scholar",
    ["askKnowledgePeople", "knowledgeHadith", "verifyNews"],
  ],
  [
    "work as amanah",
    ["fulfilContracts", "intentionHadith", "justiceExcellence"],
  ],
  [
    "truth in small tasks",
    ["safeMuslimHadith", "tradeConsent", "pietyMeasure"],
  ],
  ["prayer at work", ["prayer", "time", "capacity"]],
  [
    "respectful boundaries",
    ["humanDignity", "consultation", "safeMuslimHadith"],
  ],
  ["excellence without ego", ["pietyMeasure", "purpose", "moderation"]],
  ["name loneliness and belonging", ["capacity", "duaNear", "humanDignity"]],
  ["name the loneliness", ["capacity", "duaNear", "humanDignity"]],
  [
    "connection without losing yourself",
    ["humanDignity", "capacity", "safeMuslimHadith"],
  ],
  ["community belonging step", ["believerBrotherhood", "holdFast", "dialogue"]],
  ["take one community step", ["believerBrotherhood", "holdFast", "dialogue"]],
  [
    "friendship and good company",
    ["safeMuslimHadith", "backbiting", "propheticExample"],
  ],
  [
    "masjid confidence and community care",
    ["believerBrotherhood", "holdFast", "dialogue"],
  ],
  [
    "serve before you are known",
    ["charity", "intentionHadith", "safeMuslimHadith"],
  ],
  [
    "healthy boundaries for belonging",
    ["pietyMeasure", "humanDignity", "purpose"],
  ],
  ["belong without performing", ["pietyMeasure", "humanDignity", "purpose"]],
  [
    "prophetic character becomes practice",
    ["propheticExample", "intentionHadith", "consistentDeedsHadith"],
  ],
  [
    "love becomes practice",
    ["propheticExample", "intentionHadith", "consistentDeedsHadith"],
  ],
  [
    "prophetic truth and patience",
    ["safeMuslimHadith", "fulfilContracts", "pietyMeasure"],
  ],
  [
    "truthfulness for one day",
    ["safeMuslimHadith", "fulfilContracts", "pietyMeasure"],
  ],
  [
    "prophetic mercy in a tense moment",
    ["angerHadith", "familyKindness", "propheticExample"],
  ],
  [
    "mercy in a tense moment",
    ["angerHadith", "familyKindness", "propheticExample"],
  ],
  [
    "prophetic service with humility",
    ["charity", "hiddenPublicCharity", "intentionHadith"],
  ],
  [
    "service without being seen",
    ["charity", "hiddenPublicCharity", "intentionHadith"],
  ],
  [
    "prophetic practice book with consistency",
    ["propheticExample", "knowledgeHadith", "time"],
  ],
  [
    "review the sunnah you lived",
    ["propheticExample", "knowledgeHadith", "time"],
  ],
  ["the ruh", ["purpose", "dhikrHeart", "intentionHadith"]],
  ["qadr and freedom", ["lifeTest", "capacity", "tawakkul"]],
  ["time as amanah", ["time", "intentionHadith", "lifeTest"]],
  ["psychology of addiction", ["repentance", "capacity", "hope"]],
  ["decision rules", ["intentionHadith", "time", "tawakkul"]],
  [
    "discipline through faith",
    ["consistentDeedsHadith", "prayer", "dhikrHeart"],
  ],
  ["five pillars", ["prayer", "fasting", "zakat"]],
  ["warrior routine", ["capacity", "time", "consistentDeedsHadith"]],
  ["wealth, work and worship", ["charity", "zakat", "dunyaAkhirah"]],
  [
    "brotherhood and boundaries",
    ["safeMuslimHadith", "backbiting", "capacity"],
  ],
  ["real world survival", ["capacity", "sabr", "tawakkul"]],
  [
    "marriage, love and leadership",
    ["marriage", "familyKindness", "knowledgeHadith"],
  ],
  ["mental strength", ["sabr", "capacity", "hope"]],
  ["spiritual addiction", ["repentance", "capacity", "intentionHadith"]],
  ["modern world vs", ["time", "gaze", "purpose"]],
  ["vision and mission", ["purpose", "dunyaAkhirah", "lifeTest"]],
  ["scholar and the soldier", ["knowledgeHadith", "sabr", "intentionHadith"]],
  ["thinking of jannah", ["death", "dunyaAkhirah", "safeMuslimHadith"]],
  ["light for others", ["dawah", "safeMuslimHadith", "charity"]],
  ["final sujud", ["death", "prayer", "hope"]],
];

function sourceKeysForTopic(
  title: string,
  category: LibraryCategory,
): VerifiedSourceKey[] {
  const text = `${title} ${category}`.toLowerCase();

  for (const [hint, keys] of CHAPTER_SOURCE_HINTS) {
    if (text.includes(hint)) return keys;
  }

  if (text.includes("fatihah"))
    return ["fatihahWhole", "fatihahHelp", "fatihahStraightPath"];
  if (text.includes("wudu") || text.includes("purification"))
    return ["wudu", "prayer"];
  if (
    text.includes("salah") ||
    text.includes("prayer") ||
    text.includes("khushu") ||
    text.includes("witr") ||
    text.includes("takbir")
  ) {
    return ["prayer", "salahPrevents", "consistentDeedsHadith"];
  }
  if (
    text.includes("fiqh") ||
    text.includes("madhhab") ||
    text.includes("ruling")
  ) {
    return ["knowledgeHadith", "readCommand", "capacity"];
  }
  if (text.includes("dua")) return ["duaHadith", "tawakkul", "hope"];
  if (text.includes("dhikr") || text.includes("remembrance"))
    return ["dhikrHeart", "consistentDeedsHadith"];
  if (text.includes("marriage")) return ["marriage", "familyKindness"];
  if (
    text.includes("parents and family ties") ||
    text.includes("honour") ||
    text.includes("family ties")
  )
    return ["parents", "familyKindness", "capacity"];
  if (text.includes("children") || text.includes("parent"))
    return ["children", "parents", "luqmanParenting"];
  if (text.includes("anger")) return ["anger", "angerHadith"];
  if (
    text.includes("last ten") ||
    text.includes("laylat") ||
    text.includes("qadr")
  )
    return ["qadrNight", "quranRecitation", "duaHadith"];
  if (
    text.includes("wealth") ||
    text.includes("work") ||
    text.includes("business") ||
    text.includes("contract") ||
    text.includes("zakat") ||
    text.includes("charity")
  ) {
    return ["charity", "zakat", "dunyaAkhirah"];
  }
  if (
    text.includes("ramadan") ||
    text.includes("fasting") ||
    text.includes("night") ||
    text.includes("eid")
  )
    return ["fasting", "sabr"];
  if (text.includes("hajj") || text.includes("umrah")) return ["hajj", "sabr"];
  if (
    text.includes("hifz") ||
    text.includes("quran") ||
    text.includes("surah") ||
    text.includes("arabic") ||
    text.includes("root")
  ) {
    return ["quranRecitation", "quranEase", "knowledgeHadith"];
  }
  if (
    text.includes("death") ||
    text.includes("akhirah") ||
    text.includes("jannah")
  )
    return ["death", "lifeTest"];
  if (
    text.includes("purpose") ||
    text.includes("dunya") ||
    text.includes("ambition") ||
    text.includes("status")
  )
    return ["purpose", "dunyaAkhirah", "intentionHadith"];
  if (
    text.includes("identity") ||
    text.includes("modern world") ||
    text.includes("excellence")
  )
    return ["purpose", "propheticExample", "safeMuslimHadith"];
  if (
    text.includes("social") ||
    text.includes("gaze") ||
    text.includes("modesty")
  )
    return ["gaze", "backbiting"];
  if (
    text.includes("non muslim") ||
    text.includes("family conversation") ||
    text.includes("explain")
  )
    return ["dawah", "dialogue"];
  if (text.includes("women"))
    return ["womenFaith", "capacity", "knowledgeHadith"];
  if (
    text.includes("anxiety") ||
    text.includes("sabr") ||
    text.includes("hardship") ||
    text.includes("pain") ||
    text.includes("sadness") ||
    text.includes("grief")
  ) {
    return ["sabr", "capacity", "hope"];
  }
  if (
    text.includes("repentance") ||
    text.includes("sin") ||
    text.includes("shame") ||
    text.includes("addiction") ||
    text.includes("bad habit")
  ) {
    return ["repentance", "capacity", "intentionHadith"];
  }
  if (
    text.includes("character") ||
    text.includes("manners") ||
    text.includes("adab") ||
    text.includes("brotherhood") ||
    text.includes("sisterhood")
  ) {
    return ["backbiting", "safeMuslimHadith", "propheticExample"];
  }
  if (
    text.includes("time") ||
    text.includes("routine") ||
    text.includes("discipline") ||
    text.includes("student") ||
    text.includes("focus")
  ) {
    return ["time", "intentionHadith", "consistentDeedsHadith"];
  }
  if (text.includes("seerah") || text.includes("prophet"))
    return ["propheticExample", "safeMuslimHadith"];

  return ["intentionHadith", "purpose"];
}

function hashText(input: string): number {
  return input.split("").reduce((sum, char) => {
    return (sum * 31 + char.charCodeAt(0)) >>> 0;
  }, 0);
}

function rotateCandidates(
  candidates: VerifiedSourceKey[],
  seed: string,
): VerifiedSourceKey[] {
  if (candidates.length <= 1) return candidates;
  const offset = hashText(seed) % candidates.length;
  return [...candidates.slice(offset), ...candidates.slice(0, offset)];
}

function supplementalSourceCandidatesForTopic(
  title: string,
  category: LibraryCategory,
): VerifiedSourceKey[] {
  const text = `${title} ${category}`.toLowerCase();

  if (text.includes("real world survival")) {
    return ["humanDignity", "justiceExcellence", "easeAfterHardship"];
  }
  if (text.includes("modern world")) {
    return ["verifyNews", "avoidZina", "humanDignity"];
  }
  if (text.includes("decision rules")) {
    return ["verifyNews", "adviceHadith", "justiceExcellence"];
  }
  if (text.includes("five pillars")) {
    return ["moderation", "khushuBelievers", "hiddenPublicCharity"];
  }
  if (text.includes("warrior routine")) {
    return ["moderation", "fearAllahAbility", "justiceExcellence"];
  }
  if (text.includes("fatihah")) {
    return ["duaNear", "quranTartil", "askKnowledgePeople"];
  }
  if (
    text.includes("quran") ||
    text.includes("hifz") ||
    text.includes("surah") ||
    text.includes("arabic") ||
    text.includes("root") ||
    text.includes("recitation")
  ) {
    return ["quranTartil", "quranHealing", "verifyNews", "askKnowledgePeople"];
  }
  if (
    text.includes("salah") ||
    text.includes("prayer") ||
    text.includes("khushu") ||
    text.includes("witr") ||
    text.includes("takbir")
  ) {
    return ["khushuBelievers", "familyPrayer", "duaNear", "moderation"];
  }
  if (text.includes("wudu") || text.includes("purification")) {
    return ["askKnowledgePeople", "khushuBelievers", "moderation"];
  }
  if (
    text.includes("fiqh") ||
    text.includes("madhhab") ||
    text.includes("ruling") ||
    text.includes("hadith")
  ) {
    return ["askKnowledgePeople", "verifyNews", "adviceHadith"];
  }
  if (text.includes("dua")) {
    return ["duaNear", "adviceHadith", "easeAfterHardship"];
  }
  if (text.includes("dhikr") || text.includes("remembrance")) {
    return ["duaNear", "quranHealing", "fearAllahAbility"];
  }
  if (text.includes("marriage")) {
    return ["consultation", "justiceExcellence", "familyPrayer"];
  }
  if (
    text.includes("parents") ||
    text.includes("family") ||
    text.includes("children") ||
    text.includes("parent")
  ) {
    return ["familyPrayer", "childrenAdornment", "consultation"];
  }
  if (
    text.includes("character") ||
    text.includes("manners") ||
    text.includes("adab") ||
    text.includes("anger")
  ) {
    return ["justiceExcellence", "believerBrotherhood", "pietyMeasure"];
  }
  if (
    text.includes("brotherhood") ||
    text.includes("sisterhood") ||
    text.includes("company")
  ) {
    return ["believerBrotherhood", "holdFast", "brotherhoodHadith"];
  }
  if (
    text.includes("wealth") ||
    text.includes("work") ||
    text.includes("business") ||
    text.includes("contract") ||
    text.includes("zakat") ||
    text.includes("charity") ||
    text.includes("giving")
  ) {
    return [
      "fulfilContracts",
      "tradeConsent",
      "hiddenPublicCharity",
      "spendingBalance",
    ];
  }
  if (
    text.includes("ramadan") ||
    text.includes("fasting") ||
    text.includes("night") ||
    text.includes("eid")
  ) {
    return ["quranTartil", "duaNear", "spendingBalance"];
  }
  if (text.includes("hajj") || text.includes("umrah")) {
    return ["pietyMeasure", "fearAllahAbility", "consultation"];
  }
  if (
    text.includes("revert") ||
    text.includes("non muslim") ||
    text.includes("conversation") ||
    text.includes("explain") ||
    text.includes("dawah")
  ) {
    return ["bestCommunity", "humanDignity", "pietyMeasure", "adviceHadith"];
  }
  if (
    text.includes("women") ||
    text.includes("dignity") ||
    text.includes("identity")
  ) {
    return ["womenMenAllies", "pietyMeasure", "humanDignity"];
  }
  if (
    text.includes("anxiety") ||
    text.includes("sabr") ||
    text.includes("hardship") ||
    text.includes("pain") ||
    text.includes("sadness") ||
    text.includes("grief")
  ) {
    return ["easeAfterHardship", "quranHealing", "duaNear"];
  }
  if (
    text.includes("repentance") ||
    text.includes("sin") ||
    text.includes("shame") ||
    text.includes("addiction") ||
    text.includes("bad habit")
  ) {
    return ["repentanceGoodDeeds", "avoidZina", "easeAfterHardship"];
  }
  if (
    text.includes("social") ||
    text.includes("gaze") ||
    text.includes("modesty") ||
    text.includes("online")
  ) {
    return ["avoidZina", "verifyNews", "humanDignity"];
  }
  if (
    text.includes("death") ||
    text.includes("akhirah") ||
    text.includes("jannah")
  ) {
    return ["easeAfterHardship", "childrenAdornment", "fearAllahAbility"];
  }
  if (
    text.includes("purpose") ||
    text.includes("dunya") ||
    text.includes("ambition") ||
    text.includes("status") ||
    text.includes("mission")
  ) {
    return ["childrenAdornment", "pietyMeasure", "fearAllahAbility"];
  }
  if (
    text.includes("time") ||
    text.includes("routine") ||
    text.includes("discipline") ||
    text.includes("student") ||
    text.includes("focus") ||
    text.includes("decision")
  ) {
    return ["fearAllahAbility", "quranTartil", "tawakkulCamelHadith"];
  }
  if (text.includes("seerah") || text.includes("prophet")) {
    return ["bestCommunity", "adviceHadith", "humanDignity"];
  }

  return ["justiceExcellence", "humanDignity", "fearAllahAbility"];
}

function sourceKeysForChapter(
  bookId: string,
  chapterId: string,
  title: string,
  category: LibraryCategory,
): VerifiedSourceKey[] {
  const baseKeys = sourceKeysForTopic(`${bookId} ${title}`, category).slice(
    0,
    3,
  );
  const supplementalKey = rotateCandidates(
    supplementalSourceCandidatesForTopic(`${bookId} ${title}`, category).filter(
      (key) => !baseKeys.includes(key),
    ),
    `${bookId}:${chapterId}:${title}`,
  )[0];
  return [...new Set([...baseKeys, supplementalKey].filter(Boolean))].slice(
    0,
    4,
  ) as VerifiedSourceKey[];
}

function verifiedSourcesForTopic(
  bookId: string,
  chapterId: string,
  title: string,
  category: LibraryCategory,
): SourceRef[] {
  return sourceKeysForChapter(bookId, chapterId, title, category).map(
    (key, index) =>
      verifiedSource(key, `${bookId}-${chapterId}`, index + 1, title),
  );
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function themeNoun(theme: LibraryCategory): string {
  const labels: Partial<Record<LibraryCategory, string>> = {
    Quran: "Quran connection",
    Arabic: "Arabic learning",
    "Self-Discipline": "self-discipline",
    Worship: "worship",
    "Duas & Dhikr": "dua and dhikr",
    Family: "family life",
    Character: "character",
    "Wealth & Work": "wealth and work",
    Reverts: "new Muslim learning",
    Ramadan: "Ramadan worship",
    Hifz: "memorisation",
    Akhirah: "Akhirah reflection",
    "Youth & Modern Struggles": "modern Muslim life",
  };
  return labels[theme] ?? theme.toLowerCase();
}

function chapterLessonBody(title: string, theme: LibraryCategory): string {
  const subject = title.toLowerCase();
  const domain = themeNoun(theme);
  return `${title} asks the reader to turn ${domain} into a specific trust before Allah rather than a loose intention. Locate the chapter focus in one ordinary scene: a prayer time, a conversation, a private screen, a family duty, a work choice, a moment of tiredness, or a decision about what to do next. Read the source cards as guardrails for direction, then ask what they protect in the heart: sincerity, restraint, gratitude, courage, mercy, patience, truthfulness, or cleaner worship. A useful reading should finish with one named action, one risk to watch, and one way to review the action tomorrow. If ${subject} touches a personal ruling, family conflict, health question, money matter, or madhhab-specific detail, use the chapter to prepare better questions for qualified scholarship rather than treating a short app lesson as a private verdict.`;
}

function ruhFocusLessonBody(title: string, index: number): string {
  if (index === 0) {
    return "Every human being carries an inner world: the ruh that longs for Allah, the nafs that pulls toward comfort and appetite, and the qalb that is shaped by what it repeatedly loves, fears, remembers, and chooses. Ruh Focus opens by helping the reader notice that inner movement without turning it into despair. The goal is disciplined awareness: to see the moment before a habit takes over, to remember Allah before the heart hardens, and to train the self with mercy, worship, and practical boundaries. This is reflective guidance with source anchors, not a final ruling on spiritual psychology or a substitute for scholars, counsellors, or trusted elders when the situation is serious.";
  }

  return `${title} extends the Ruh Focus method into one concrete pressure point of modern Muslim life. Read it as a training session for the heart: identify the desire, fear, distraction, or responsibility in front of you; bring it under intention; then choose a response that protects worship and character. The chapter keeps discipline connected to mercy, because lasting change rarely comes from shame alone. It comes from tawbah, honest planning, better company, protected routines, and returning to Allah after slips. Where the subject touches marriage, addiction, mental health, wealth, or family rights, use the reflection as preparation for a qualified conversation rather than as a private verdict.`;
}

type ChapterContentOverride = Partial<
  Pick<
    Chapter,
    | "subtitle"
    | "estimatedMinutes"
    | "sections"
    | "reflectionQuestions"
    | "actionSteps"
    | "quiz"
    | "audioScript"
  >
>;

type LibraryReviewMetadata = {
  verifiedContentStatus: Extract<VerifiedContentStatus, "published">;
  reviewEvidence: LibraryReviewEvidence;
};

export const LIBRARY_REVIEW_EVIDENCE: Partial<
  Record<string, LibraryReviewMetadata>
> = {
  // REVIEW_EVIDENCE_START
  // Real reviewer sign-off evidence is imported here by:
  // npm run apply:library-review-evidence -- --file /absolute/path/to/real-review-evidence.json --write
  // REVIEW_EVIDENCE_END
};

function reviewMetadataForBook(
  bookId: string,
  fallbackStatus: VerifiedContentStatus,
): Pick<Book, "verifiedContentStatus" | "reviewEvidence"> {
  const reviewMetadata = LIBRARY_REVIEW_EVIDENCE[bookId];
  if (!reviewMetadata) {
    return {
      verifiedContentStatus: fallbackStatus,
      reviewEvidence: undefined,
    };
  }

  return {
    verifiedContentStatus: reviewMetadata.verifiedContentStatus,
    reviewEvidence: reviewMetadata.reviewEvidence,
  };
}

const CATEGORY_COVER_CODES: Record<LibraryCategory, string> = {
  Quran: "QUR",
  Arabic: "ARB",
  Worship: "SLH",
  "Duas & Dhikr": "DHR",
  "Self-Discipline": "NAF",
  Family: "FAM",
  Character: "ADB",
  "Wealth & Work": "WRK",
  Reverts: "NEW",
  Ramadan: "RAM",
  Hifz: "HFZ",
  Akhirah: "AKH",
  "Youth & Modern Struggles": "MOD",
};

const CATEGORY_DEFAULT_MOTIFS: Record<LibraryCategory, BookCoverMotif> = {
  Quran: "quran",
  Arabic: "arabic",
  Worship: "salah",
  "Duas & Dhikr": "dua",
  "Self-Discipline": "habits",
  Family: "parenting",
  Character: "adab",
  "Wealth & Work": "wealth",
  Reverts: "revert",
  Ramadan: "ramadan",
  Hifz: "hifz",
  Akhirah: "akhirah",
  "Youth & Modern Struggles": "identity",
};

function coverMotifForBook(
  bookId: string,
  title: string,
  category: LibraryCategory,
): BookCoverMotif {
  const text = `${bookId} ${title}`.toLowerCase();
  if (text.includes("fatihah")) return "fatihah";
  if (text.includes("names of allah")) return "dhikr";
  if (text.includes("root")) return "roots";
  if (text.includes("arabic")) return "arabic";
  if (
    text.includes("khushu") ||
    text.includes("salah") ||
    text.includes("jumuah") ||
    text.includes("masjid")
  )
    return "salah";
  if (text.includes("wudu") || text.includes("purification"))
    return "purification";
  if (text.includes("morning")) return "morning";
  if (text.includes("habit") || text.includes("discipline")) return "habits";
  if (text.includes("phone") || text.includes("detox")) return "attention";
  if (text.includes("dua")) return "dua";
  if (text.includes("dhikr")) return "dhikr";
  if (text.includes("marriage")) return "marriage";
  if (text.includes("children") || text.includes("raising")) return "parenting";
  if (text.includes("character") || text.includes("manners")) return "adab";
  if (text.includes("anger")) return "anger";
  if (text.includes("wealth") || text.includes("work")) return "wealth";
  if (text.includes("business")) return "business";
  if (text.includes("new-muslim") || text.includes("curious")) return "revert";
  if (text.includes("explaining")) return "dawah";
  if (text.includes("last-ten") || text.includes("night"))
    return "laylatul-qadr";
  if (text.includes("ramadan")) return "ramadan";
  if (text.includes("hifz")) return "hifz";
  if (text.includes("death") || text.includes("akhirah")) return "akhirah";
  if (text.includes("purpose")) return "purpose";
  if (text.includes("social-media")) return "attention";
  if (text.includes("gaze")) return "modesty";
  if (text.includes("sabr") || text.includes("anxiety")) return "sabr";
  if (text.includes("repentance")) return "tawbah";
  if (text.includes("identity")) return "identity";
  if (text.includes("women")) return "women";
  if (text.includes("food") || text.includes("halal")) return "fiqh";
  if (text.includes("charity")) return "charity";
  if (text.includes("zakat")) return "zakat";
  if (text.includes("hajj") || text.includes("umrah")) return "hajj";
  if (text.includes("seerah") || text.includes("prophet")) return "seerah";
  if (text.includes("hadith") || text.includes("sunnah")) return "hadith";
  if (text.includes("fiqh")) return "fiqh";
  if (text.includes("loneliness") || text.includes("belonging"))
    return "community";
  if (text.includes("brotherhood") || text.includes("sisterhood"))
    return "community";
  if (text.includes("student")) return "student";
  if (text.includes("ruh-focus")) return "focus";
  return CATEGORY_DEFAULT_MOTIFS[category];
}

function coverEditionForBook(verifiedContentStatus: VerifiedContentStatus) {
  if (verifiedContentStatus === "published") return "Approved NurAI edition";
  if (verifiedContentStatus === "user_original") return "NurAI original";
  return "NurAI exclusive";
}

function coverDesignForBook(params: {
  id: string;
  title: string;
  category: LibraryCategory;
  coverVariant: Book["coverVariant"];
  verifiedContentStatus: VerifiedContentStatus;
}): Book["coverDesign"] {
  return {
    accent: params.coverVariant,
    motif: coverMotifForBook(params.id, params.title, params.category),
    eyebrow: params.category,
    seal: CATEGORY_COVER_CODES[params.category],
    edition: coverEditionForBook(params.verifiedContentStatus),
  };
}

const CHAPTER_CONTENT_OVERRIDES: Record<string, ChapterContentOverride> = {
  "understand-surah-al-fatihah-ch-1": {
    subtitle: "See why this surah trains every conversation with Allah",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Al-Fatihah is not only the first surah in the mushaf. It is the doorway through which the praying Muslim enters salah again and again. The surah teaches the heart how to stand before Allah: with praise, need, hope, awe, and a request for guidance. Starting with Al-Fatihah means starting with relationship rather than information. The servant does not rush into demands. The servant first recognises the Lord of all worlds, then remembers mercy, accountability, worship, dependence, and the need to be guided to a path already walked by those Allah favoured. This chapter should help the user slow down the opening of prayer and notice that every rak'ah begins by re-ordering the heart.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Think about your last salah. Did Al-Fatihah feel like a familiar sound, or like a direct address to Allah? Do not answer with guilt. Answer with awareness, then ask what one phrase could become more alive in the next prayer.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Before your next salah, pause for five seconds before reciting. Say to yourself: I am about to praise Allah and ask Him for guidance. Then recite the first ayah more slowly than usual.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards below to anchor the chapter in Quran study and prayer meaning. Detailed tafsir points, recitation variants, and legal discussions should be checked with qualified teachers.",
      },
    ],
    reflectionQuestions: [
      "Which phrase of Al-Fatihah do you usually pass over too quickly?",
      "What would change in salah if you entered the surah as a direct request for guidance?",
    ],
    actionSteps: [
      "Read a translation of Al-Fatihah once before your next prayer.",
      "Choose one phrase to recite more slowly in the next rak'ah.",
      "Write one sentence about what guidance means in your real life today.",
    ],
    quiz: [
      {
        question: "What does Al-Fatihah do at the start of prayer?",
        options: [
          "It trains praise, dependence, and the request for guidance",
          "It is only an opening sound before the real prayer begins",
          "It replaces the need to understand the rest of salah",
        ],
        correctAnswer:
          "It trains praise, dependence, and the request for guidance",
        explanation:
          "Al-Fatihah gathers praise of Allah, worship, reliance, and the central dua for guidance.",
      },
    ],
    audioScript:
      "Al-Fatihah opens salah by teaching the heart how to speak to Allah: praise first, then need, worship, reliance, and guidance.",
  },
  "understand-surah-al-fatihah-ch-2": {
    subtitle: "Let mercy shape how you hear the beginning of the surah",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The names of mercy in Al-Fatihah stop the heart from imagining Allah through fear alone. The surah begins with Allah's care over all worlds and then repeats mercy before mentioning the Day of Judgement. This order matters for worship. A Muslim should feel accountable, but accountability is not meant to erase hope. Mercy gives the servant courage to return, repent, ask, and keep walking after weakness. The user should not turn mercy into carelessness, and should not turn judgement into despair. Al-Fatihah holds both together: the Most Merciful is also the Master of the Day when every deed is returned to its owner.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Notice whether your inner voice leans more toward despair or carelessness. Which phrase of the surah corrects that imbalance: mercy, lordship, or the Day of Judgement?",
      },
      {
        type: "action",
        heading: "Act",
        body: "After reciting the names of mercy in your next salah, ask Allah quietly for one specific mercy: forgiveness, steadiness, a softer heart, protection from a habit, or help with a family responsibility.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Read the source cards as a guardrail: mercy should create return and obedience, not false confidence, and judgement should create seriousness without despair.",
      },
    ],
    reflectionQuestions: [
      "Where do you need to believe in Allah's mercy more deeply?",
      "Where do you need accountability to make your hope more honest?",
    ],
    actionSteps: [
      "Memorise the meaning of the names of mercy used in Al-Fatihah.",
      "Make one private dua for mercy after your next prayer.",
      "Identify one action that would show you are not taking mercy for granted.",
    ],
    quiz: [
      {
        question: "How should mercy and judgement work together in this surah?",
        options: [
          "Mercy gives hope, and judgement gives seriousness",
          "Mercy means actions no longer matter",
          "Judgement means a believer should stop hoping",
        ],
        correctAnswer: "Mercy gives hope, and judgement gives seriousness",
        explanation:
          "Al-Fatihah teaches the servant to return to Allah with hope while living with accountability.",
      },
    ],
    audioScript:
      "When you recite the names of mercy, let hope return. When you remember the Day of Judgement, let that hope become sincere action.",
  },
  "understand-surah-al-fatihah-ch-3": {
    subtitle: "Turn worship and reliance into a lived daily promise",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The middle of Al-Fatihah is a covenant in the language of prayer: You alone we worship, and You alone we ask for help. The order is important. Worship is not presented as self-powered performance. The servant worships Allah and admits dependence on Allah in the same breath. This protects the user from two mistakes: acting religious while relying only on the self, or asking for help while refusing the worship Allah commanded. In daily life this ayah can reshape choices around time, money, attention, family, work, and private habits. The question becomes simple and serious: does this action fit the worship of Allah, and have I asked Allah for the help to carry it?",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Choose one pressure in your day: phone use, anger, prayer delay, income, modesty, family speech, or laziness. Ask how the ayah changes that pressure when worship and reliance are held together.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Before one difficult task today, say a short dua for help and then take the first lawful step. Do not wait for motivation to become perfect.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to connect reliance with obedience. This chapter gives spiritual practice, not a ruling for complex personal cases.",
      },
    ],
    reflectionQuestions: [
      "Where are you trying to obey Allah while forgetting to ask Him for help?",
      "Where are you asking for ease while avoiding the first act of worship required from you?",
    ],
    actionSteps: [
      "Write one sentence beginning: I need Allah's help with...",
      "Take one lawful first step connected to that need.",
      "Review tonight whether reliance made you calmer and more responsible.",
    ],
    quiz: [
      {
        question: "What balance does this part of Al-Fatihah teach?",
        options: [
          "Worship Allah and seek help from Allah",
          "Rely on yourself first and ask Allah later",
          "Ask for help while leaving worship aside",
        ],
        correctAnswer: "Worship Allah and seek help from Allah",
        explanation:
          "The ayah joins worship and reliance, so the servant acts while knowing every success needs Allah's help.",
      },
    ],
    audioScript:
      "You alone we worship, and You alone we ask for help. Let that sentence become a plan for one hard moment today.",
  },
  "understand-surah-al-fatihah-ch-4": {
    subtitle: "Ask for guidance as a path, not just a feeling",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The final request of Al-Fatihah is guidance to the straight path. The wording reminds the believer that guidance is more than knowing an idea. A path is walked. It has direction, companions, dangers, and repeated choices. The surah asks for the path of those Allah favoured, while seeking protection from paths of corruption, anger, error, or losing truth after it is known. For the user, this means the dua should become practical: guidance in prayer, speech, relationships, money, study, screens, and repentance. The straight path is not a mood that visits occasionally. It is a mercy from Allah that must be requested and then followed step by step.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Name one area where you already know the better path but struggle to walk it. Then name one area where you genuinely need to learn before acting.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a small guidance map: one thing to stop, one thing to start, and one person or source that can help you stay on the path for the next week.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards as a starting point for understanding guidance. For tafsir depth, creed discussions, and detailed meanings of the final phrases, study with trusted scholars and reliable tafsir works.",
      },
    ],
    reflectionQuestions: [
      "What does guidance need to look like in your next seven days?",
      "Which companion, teacher, family member, or source helps you stay closer to the straight path?",
    ],
    actionSteps: [
      "Write one stop, one start, and one support for the next week.",
      "Make the dua for guidance slowly in your next three prayers.",
      "Review after one week whether your choices moved closer to that dua.",
    ],
    quiz: [
      {
        question: "What does asking for the straight path require after salah?",
        options: [
          "Walking toward guidance through real choices",
          "Feeling inspired without changing anything",
          "Assuming guidance is only for other people",
        ],
        correctAnswer: "Walking toward guidance through real choices",
        explanation:
          "Al-Fatihah asks Allah for guidance, and the believer should then take practical steps toward the path being requested.",
      },
    ],
    audioScript:
      "When you ask for the straight path, ask with your tongue and then walk with your choices. Guidance is requested, learned, and lived.",
  },
  "salah-for-absolute-beginners-ch-1": {
    subtitle: "Prepare for prayer with calm, cleanliness, and intention",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Before salah, a beginner needs two kinds of preparation: outward readiness and inward attention. Outward readiness means checking the prayer time, purification, clothing, place of prayer, and direction as well as you are able. Inward attention means remembering that salah is not a performance for people. It is a meeting with Allah, built around remembrance, humility, and need. A new Muslim or returning Muslim should not be crushed by learning everything at once. Start by making the prayer space clean, learning wudu carefully from a reliable teacher, and arriving to the prayer with a few quiet seconds before beginning. If you are unsure about purification, illness, menstruation, travel, missed prayers, or exact legal details, ask a qualified teacher rather than guessing.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Think about the few minutes before prayer. What usually makes you rush: delay, phone use, uncertainty, embarrassment, tiredness, or not knowing the steps? Name the obstacle without shame so you can plan around it.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a small pre-salah checklist: time, wudu, clean place, qibla, phone away, one quiet breath. Keep it visible until preparation becomes natural.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect salah with remembrance and a changed life. Use this chapter for orientation, then learn purification and prayer details from a qualified local teacher or trusted beginner class.",
      },
    ],
    reflectionQuestions: [
      "What one thing would make it easier for you to begin prayer on time?",
      "Where do you need a teacher's help instead of trying to work it out alone?",
    ],
    actionSteps: [
      "Write a five-point pre-salah checklist.",
      "Choose one reliable teacher, mosque class, or beginner guide for wudu and prayer details.",
      "Put your phone away before one prayer today.",
    ],
    quiz: [
      {
        question: "What should a beginner do when unsure about prayer details?",
        options: [
          "Ask a qualified teacher and keep learning steadily",
          "Guess and never ask anyone",
          "Delay all prayer until every detail feels perfect",
        ],
        correctAnswer: "Ask a qualified teacher and keep learning steadily",
        explanation:
          "Beginners should pray, keep learning, and ask qualified people about details instead of being frozen by uncertainty.",
      },
    ],
    audioScript:
      "Before you pray, slow down. Check the time, purification, place, direction, and intention. Then stand before Allah as a learner who is welcome to keep growing.",
  },
  "salah-for-absolute-beginners-ch-2": {
    subtitle: "Learn the broad structure before worrying about perfection",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The shape of salah gives the body a path for worship: standing, reciting, bowing, rising, prostrating, sitting, and ending with salam. Each movement teaches something. Standing reminds you that you are before Allah. Bowing lowers pride. Prostration places the noblest part of the body on the ground and trains surrender. Sitting gives the prayer a moment of testimony and dua. A beginner should learn the order carefully, but should also understand the mercy of gradual learning. Do not treat mistakes as proof that you cannot pray. Treat them as signs of what to revise next with a teacher. The aim is a prayer that becomes more correct, more present, and more beloved over time.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which part of the prayer currently feels most unfamiliar: standing, recitation, bowing, prostration, sitting, or ending? Choose one part to practise slowly outside prayer.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Practise the prayer sequence once without rushing. Say the movement names quietly: stand, bow, rise, prostrate, sit, prostrate, stand. Then review the exact method with a reliable teacher or guide.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards show that salah is for remembrance and moral formation. Exact prayer method details should be learned from qualified instruction, especially where schools of law differ.",
      },
    ],
    reflectionQuestions: [
      "Which movement helps you feel humility most clearly?",
      "What one part of the prayer sequence do you need to revise this week?",
    ],
    actionSteps: [
      "Practise the broad movement sequence outside prayer.",
      "Watch or attend one reliable beginner lesson on salah posture.",
      "Ask one specific question about the part you find most confusing.",
    ],
    quiz: [
      {
        question:
          "How should a beginner respond to mistakes in the prayer sequence?",
        options: [
          "Use them as a learning signal and seek qualified help",
          "Assume prayer is impossible",
          "Ignore the order completely",
        ],
        correctAnswer: "Use them as a learning signal and seek qualified help",
        explanation:
          "Salah should be learned with care, but beginners grow through correction, practice, and asking reliable teachers.",
      },
    ],
    audioScript:
      "Salah has a shape: standing, bowing, prostrating, sitting, and returning to Allah with the body and heart. Learn the order calmly.",
  },
  "salah-for-absolute-beginners-ch-3": {
    subtitle: "Understand the core words enough to pray with awareness",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A beginner does not need to understand every Arabic phrase before starting salah, but meaning should grow from the first week. The opening takbir reminds you that Allah is greater than what was occupying your mind. Al-Fatihah teaches praise, mercy, worship, reliance, and guidance. The words in bowing and prostration train glorification and humility. The sitting words teach testimony, salawat, and dua. Learn the required phrases from a teacher, then attach a simple meaning to each section so the prayer is not only mouth movement. If Arabic pronunciation is difficult, keep practising gently. Allah knows the effort, and reliable teachers can help you improve without shame.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Choose one phrase you already say in salah. What does it ask your heart to remember? If you do not know yet, make that phrase your next learning target.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make a meaning card for one prayer phrase: Arabic transliteration if needed, simple translation, when it is said, and what feeling it should train.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor salah in remembrance and steady deeds. Use them to connect prayer words to worship, then learn wording and pronunciation from a reliable teacher.",
      },
    ],
    reflectionQuestions: [
      "Which phrase in salah do you most want to understand this week?",
      "How would your prayer change if Al-Fatihah felt like a real conversation with Allah?",
    ],
    actionSteps: [
      "Choose one phrase and learn its simple meaning.",
      "Practise that phrase slowly outside prayer.",
      "Use the meaning once in prayer without extending the prayer beyond what you can manage.",
    ],
    quiz: [
      {
        question:
          "What is a healthy first goal for understanding prayer words?",
        options: [
          "Learn one phrase at a time and connect it to worship",
          "Wait to pray until every word is mastered",
          "Say the words forever without seeking meaning",
        ],
        correctAnswer: "Learn one phrase at a time and connect it to worship",
        explanation:
          "A beginner should pray and keep learning. Meaning can grow steadily through small, consistent study.",
      },
    ],
    audioScript:
      "Start with one phrase. Learn when you say it, what it means, and what it should awaken in the heart.",
  },
  "salah-for-absolute-beginners-ch-4": {
    subtitle: "Build a first-week plan that protects consistency",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The first week of salah should be built around consistency, not dramatic intensity. Many beginners try to fix every weakness at once and then feel defeated. A better plan is clear, small, and reviewable: know the prayer times, protect the next prayer, keep a simple checklist, learn one phrase, ask one question, and return after mistakes. The hadith source about small regular deeds is important here because the user needs a rhythm that can survive work, family, tiredness, and embarrassment. If a prayer is missed, do not let shame turn one miss into a lost day. Return, learn what happened, and ask a teacher about making up missed prayers if needed.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Look at the next seven days honestly. Which prayer is most at risk, and what practical barrier causes that risk: sleep, travel, work, family pressure, not knowing wudu, or phone distraction?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a seven-day salah tracker with one focus per day: prayer time awareness, wudu confidence, movement order, Al-Fatihah meaning, one short dua, one teacher question, and one review note.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to keep the plan tied to remembrance, character, and small regular deeds. The plan is practical coaching, not a substitute for fiqh guidance on missed prayers or personal cases.",
      },
    ],
    reflectionQuestions: [
      "Which prayer needs the strongest protection in your schedule?",
      "What is one small regular deed you can keep without burning out?",
    ],
    actionSteps: [
      "Set prayer-time reminders for the next seven days.",
      "Write one question to ask a teacher this week.",
      "Review each night without shame: what helped, what blocked you, and what is the next prayer?",
    ],
    quiz: [
      {
        question: "What is the best first-week approach to salah?",
        options: [
          "Protect consistency and keep learning step by step",
          "Try to master everything immediately or give up",
          "Only pray when it feels easy",
        ],
        correctAnswer: "Protect consistency and keep learning step by step",
        explanation:
          "A beginner needs a steady plan that protects prayer, invites learning, and makes returning after mistakes easier.",
      },
    ],
    audioScript:
      "Your first week is about returning to the next prayer. Keep the plan small, honest, and connected to Allah.",
  },
  "hifz-foundations-ch-1": {
    subtitle: "Choose a pace that your life can actually protect",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Hifz begins with love for the Quran, but it survives through a pace that can be repeated. A beginner may feel excited and choose too much too quickly, then lose heart when review becomes heavy. A stronger start is smaller: a few lines, one short passage, or an amount your teacher agrees you can revise daily. The aim is not to impress people with speed. The aim is to carry the words of Allah with care, accuracy, adab, and consistency. Your pace should respect school, work, family, sleep, prayer times, and existing Quran fluency. If your recitation has tajweed gaps, slow down and fix foundations with a teacher before adding large amounts.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Look at your real week. Which days are strong for memorisation, and which days should be review-only? A sustainable plan is honest about energy, not built on an imaginary version of you.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Pick a seven-day hifz pace: new memorisation amount, daily review amount, and one rest or catch-up slot. Show it to a teacher or trusted Quran mentor before increasing it.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards point to recitation according to ability, Quran being made easy for remembrance, and the virtue of seeking knowledge. Use them to build a plan that is steady rather than performative.",
      },
    ],
    reflectionQuestions: [
      "What amount can you revise every day without resentment or collapse?",
      "Who can correct your recitation before mistakes become memorised?",
    ],
    actionSteps: [
      "Choose a daily new-memorisation amount for one week only.",
      "Set a review amount that is larger than the new portion.",
      "Ask a teacher or capable reciter to listen before you increase the pace.",
    ],
    quiz: [
      {
        question: "What is the safest first hifz pace?",
        options: [
          "One that can be reviewed consistently and corrected by a teacher",
          "The fastest amount possible for social pressure",
          "A large amount with no revision plan",
        ],
        correctAnswer:
          "One that can be reviewed consistently and corrected by a teacher",
        explanation:
          "Hifz needs repetition, correction, and review. Speed without review often creates fragile memorisation.",
      },
    ],
    audioScript:
      "Choose a pace you can protect. The goal is not speed for people. The goal is Quran carried with care, review, and sincerity.",
  },
  "hifz-foundations-ch-2": {
    subtitle: "Let the ear learn before the tongue tries to rush",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Listening before memorising protects the beginner from building mistakes into memory. Choose one reliable reciter, follow the mushaf, and listen to the target passage several times before repeating it yourself. Notice stops, rhythm, difficult words, and places where similar endings might confuse you. Listening is not a replacement for teacher correction, but it prepares the ear to recognise what sounds right. Beginners should avoid jumping between many reciters while learning a new portion, because the goal at this stage is stability. Once the passage is familiar, recite slowly, record yourself if helpful, and compare with the mushaf while still seeking human correction.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which mistakes do you usually make because you started reciting before the passage settled in your ear: skipped words, wrong endings, mixed ayat, or uncertain stops?",
      },
      {
        type: "action",
        heading: "Act",
        body: "For your next portion, listen three times while looking at the mushaf, then recite one line slowly. Mark only the words that need teacher correction or extra listening.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards encourage regular Quran engagement and learning. Listening should lead to better recitation, not passive audio consumption without correction.",
      },
    ],
    reflectionQuestions: [
      "Which reciter will you use consistently for new memorisation?",
      "What kind of error appears when you skip listening?",
    ],
    actionSteps: [
      "Choose one reciter for the next seven days.",
      "Listen to the new passage before every memorisation attempt.",
      "Record one attempt and note two places to review with a teacher.",
    ],
    quiz: [
      {
        question: "Why should a beginner listen before memorising?",
        options: [
          "To give the ear a correct pattern before repetition",
          "To avoid ever needing a teacher",
          "To replace reading from the mushaf completely",
        ],
        correctAnswer: "To give the ear a correct pattern before repetition",
        explanation:
          "Listening helps pattern recognition, but teacher correction and careful mushaf reading remain important.",
      },
    ],
    audioScript:
      "Let the passage enter your ear before it becomes your habit. Listen, follow the mushaf, then recite slowly.",
  },
  "hifz-foundations-ch-3": {
    subtitle: "Protect old memorisation before adding more",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A hifz plan becomes weak when new memorisation is treated as success and review is treated as optional. The Quran you memorised yesterday has rights over today's schedule. Beginners should review more than they add, because fresh memorisation can feel strong for a day and then fade quickly. A simple structure is: warm up with old review, revise yesterday's portion, then add a small new section if the review is stable. If review is falling apart, pause new memorisation without shame. That pause is not failure. It is maintenance. Strong hifz is built by returning to what Allah already allowed you to learn.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Think of one passage you once knew better than you know now. What caused it to weaken: lack of review, no listener, too much new material, or confusing similar verses?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make tomorrow a review-first day. Recite older material before touching the new portion, and only add more if the review is calm and mostly accurate.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support regular recitation and disciplined learning. This chapter turns that into a maintenance habit: review is worship, not a delay.",
      },
    ],
    reflectionQuestions: [
      "Which memorised passage needs protection before you add anything new?",
      "How much review can you complete daily even on a tired day?",
    ],
    actionSteps: [
      "Set a review-first rule for the next week.",
      "Pause new memorisation for one day if old review is unstable.",
      "Ask someone to listen to one older passage this week.",
    ],
    quiz: [
      {
        question: "What should happen when review becomes weak?",
        options: [
          "Slow or pause new memorisation and repair the review",
          "Add even more new material",
          "Ignore old passages until Ramadan",
        ],
        correctAnswer: "Slow or pause new memorisation and repair the review",
        explanation:
          "Review protects the memorisation already gained. Pausing new material can be the responsible choice.",
      },
    ],
    audioScript:
      "Review is not a delay. It is how you honour what Allah already helped you memorise.",
  },
  "hifz-foundations-ch-4": {
    subtitle: "Track weak ayat with humility, not self-attack",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Weak ayat are not proof that you are bad at Quran. They are information. A weak spot may come from similar wording, a difficult transition, weak listening, low sleep, or too little review. The solution is to track the exact place instead of writing vague notes like 'this surah is weak.' Mark the ayah, the mistake type, and the next repair action: listen again, write the first words, recite to a teacher, connect the meaning, or repeat the transition before and after the weak point. Keep the tone merciful. Harshness may create a burst of effort, but steady repair comes from honesty, dua, and a plan.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Choose one weak ayah or transition. What is the actual mistake: start, ending, similar phrase, skipped word, tajweed issue, or loss of confidence?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a weak-ayah log with four fields: reference, mistake type, repair action, and next review date. Keep it short enough to use after every session.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards remind the user that Quran learning is a path of repeated effort. Tracking should support sincerity and accuracy, not turn Quran into an anxious scoreboard.",
      },
    ],
    reflectionQuestions: [
      "What weak point needs a precise repair note today?",
      "How can you correct mistakes without speaking to yourself harshly?",
    ],
    actionSteps: [
      "Log one weak ayah or transition today.",
      "Assign one repair action and one review date.",
      "Recite the repaired section to a teacher or trusted listener when possible.",
    ],
    quiz: [
      {
        question: "What is the best way to treat weak ayat?",
        options: [
          "Track the exact issue and repair it with a clear next action",
          "Use vague guilt and avoid the passage",
          "Pretend the mistake does not exist",
        ],
        correctAnswer:
          "Track the exact issue and repair it with a clear next action",
        explanation:
          "Precise tracking makes review actionable while keeping the learner hopeful and honest.",
      },
    ],
    audioScript:
      "A weak ayah is not a verdict on you. It is a place asking for care, correction, and another return.",
  },
  "the-muslim-morning-routine-ch-1": {
    subtitle: "Begin the day by deciding who the day belongs to",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A Muslim morning does not become meaningful because it is aesthetic, early, or perfectly quiet. It becomes meaningful when the day is handed back to Allah before the world starts making demands. Intention is the first anchor. Before messages, work, school, errands, and worries, the believer can decide: this day is for worship, halal effort, mercy with people, and guarding what Allah entrusted to me. That intention does not make the day easy, but it gives the day direction. A strong morning routine should be small enough to survive normal life: wake, remember Allah, prepare for prayer, avoid the first careless scroll, and choose the first responsible action.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What usually claims your heart first in the morning: notifications, stress, sleepiness, regret, work pressure, or family responsibilities? Notice the first pull so your intention can meet it.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a one-sentence morning intention and put it where you wake up. Keep it plain: Today I want to please Allah through prayer, honest work, clean speech, and patience.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect intention, time, and small regular deeds. Use them to keep the routine sincere, not performative.",
      },
    ],
    reflectionQuestions: [
      "What is the first thing that usually shapes your morning mood?",
      "What intention would make today's ordinary duties count for more?",
    ],
    actionSteps: [
      "Write one morning intention before checking your phone.",
      "Choose one avoidable morning distraction to delay by ten minutes.",
      "Review at night whether the intention changed one choice.",
    ],
    quiz: [
      {
        question: "What gives a Muslim morning its direction?",
        options: [
          "A sincere intention connected to Allah",
          "A perfect routine with no interruptions",
          "Checking every notification immediately",
        ],
        correctAnswer: "A sincere intention connected to Allah",
        explanation:
          "A routine helps, but intention is what turns ordinary actions toward worship and responsibility.",
      },
    ],
    audioScript:
      "Before the day becomes noise, give it an intention. Ask Allah to make your prayer, work, speech, and patience sincere.",
  },
  "the-muslim-morning-routine-ch-2": {
    subtitle: "Let Fajr set the direction of the day",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Fajr is more than the first task on a religious checklist. It is the morning anchor that tells the body and schedule that Allah comes before the day. For many users, the struggle is not knowing that Fajr matters. The struggle is sleep, late nights, alarms, cold rooms, low motivation, or not having a stable wind-down routine. A practical Fajr plan starts the night before: sleep with intention, reduce the last scroll, prepare what you need for wudu, set alarms responsibly, and avoid making the morning depend on willpower alone. If you miss Fajr, return without letting shame destroy the rest of the day, and ask a teacher about make-up details where needed.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What is the real reason Fajr becomes hard for you: bedtime, phone, food, anxiety, family schedule, room setup, or not knowing what to do when you wake?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Build a two-part Fajr plan: one night-before action and one morning action. Keep it realistic enough to repeat for seven days.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards on time, intention, and regular deeds help make Fajr part of a consistent life rather than a one-day burst.",
      },
    ],
    reflectionQuestions: [
      "What night habit most affects your Fajr?",
      "What would make waking for Fajr physically easier tomorrow?",
    ],
    actionSteps: [
      "Prepare your prayer space or clothes before sleep.",
      "Move your phone away from the bed or set a second responsible alarm.",
      "Write one night-before rule that protects Fajr.",
    ],
    quiz: [
      {
        question: "When does a strong Fajr plan usually begin?",
        options: [
          "The night before",
          "Only after the alarm fails",
          "After the whole day is already lost",
        ],
        correctAnswer: "The night before",
        explanation:
          "Sleep, phone habits, and preparation before bed often decide whether Fajr is protected in the morning.",
      },
    ],
    audioScript:
      "Let Fajr become the anchor. Prepare before sleep, wake with intention, and return quickly if you slip.",
  },
  "the-muslim-morning-routine-ch-3": {
    subtitle: "Make Quran the first nourishment, even in a small amount",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Ten minutes of Quran in the morning can change the emotional texture of the day. The goal is not to race through pages for a number alone. The goal is contact: recitation, listening, memorisation review, translation, or one ayah reflected on with care. Some users can read a page. Some can review a few lines. Some can listen while following the mushaf. The amount should be according to ability, but the appointment should be protected. A small daily portion builds familiarity, calms the heart, and gives the day language beyond work and worry. If recitation is weak, use the morning to improve slowly with teacher correction rather than avoiding Quran entirely.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which Quran contact is most realistic tomorrow morning: recite, listen, review memorisation, read translation, or write one reflection?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one ten-minute Quran mode for tomorrow. Decide the exact surah, page, passage, or audio before sleeping so the morning does not begin with searching.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support regular Quran recitation according to ability and structured remembrance. Let the morning portion be small, sincere, and repeatable.",
      },
    ],
    reflectionQuestions: [
      "What amount of Quran can you protect most mornings?",
      "What usually replaces Quran in the first quiet minutes of the day?",
    ],
    actionSteps: [
      "Choose tomorrow's Quran passage before bed.",
      "Set a ten-minute timer or page target.",
      "Write one line after reading: what should this ayah change today?",
    ],
    quiz: [
      {
        question: "What is the best beginner Quran goal for the morning?",
        options: [
          "A small protected portion according to ability",
          "A huge target that collapses after one day",
          "No Quran until recitation feels perfect",
        ],
        correctAnswer: "A small protected portion according to ability",
        explanation:
          "A repeatable Quran appointment is more useful than an unrealistic burst that disappears.",
      },
    ],
    audioScript:
      "Give the morning a portion of Quran, even a small one. Read, listen, review, or reflect according to your ability.",
  },
  "the-muslim-morning-routine-ch-4": {
    subtitle: "Turn responsibility into worship before the work begins",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Amanah means the day is not just a list of tasks. Work, study, parenting, promises, money, health, and time are trusts. A Muslim morning routine should therefore end with a clear plan for responsibility. The plan does not need to be complicated: three important duties, one act of worship, one relationship to protect, and one boundary against distraction or sin. Planning your amanah helps stop the day from being controlled only by urgency. It also protects sincerity: you are not merely being productive for status, you are trying to fulfil what Allah placed in your care. Review the plan at night with gratitude and tawbah, not self-hatred.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What has Allah placed in your care today: a prayer, a person, a deadline, a body, a home, a debt, a promise, or a private habit?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write today's amanah list: three duties, one worship anchor, one person to treat well, and one distraction to limit. Keep the list visible until midday.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards on time, intention, and small regular deeds help turn planning into worship rather than self-importance.",
      },
    ],
    reflectionQuestions: [
      "Which responsibility needs your best attention today?",
      "What boundary would protect your time from being wasted?",
    ],
    actionSteps: [
      "Write three amanah tasks for today.",
      "Choose one person whose rights you will be careful with.",
      "Set one practical boundary around your biggest distraction.",
    ],
    quiz: [
      {
        question: "How can planning become part of worship?",
        options: [
          "By connecting duties to intention, trust, and lawful action",
          "By chasing status through productivity",
          "By ignoring prayer until work is finished",
        ],
        correctAnswer:
          "By connecting duties to intention, trust, and lawful action",
        explanation:
          "Planning is spiritually useful when it helps a person fulfil responsibilities for Allah's sake.",
      },
    ],
    audioScript:
      "Plan your amanah: the prayer, people, duties, and boundaries Allah placed in your care today.",
  },
  "dua-and-tawakkul-ch-1": {
    subtitle: "See dua as worship, not only a request list",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Dua is not only asking Allah to change circumstances. It is worship because it shows need, humility, hope, and recognition that every good is in Allah's control. A beginner may think dua is only for emergencies, but the believer is invited to ask in ease and hardship, for deen and dunya, for forgiveness, family, provision, guidance, and a softer heart. Dua also protects the heart from pretending to be self-sufficient. The user should learn to ask with adab: praise Allah, send salawat, be honest about need, avoid sinful requests, and keep asking without turning dua into a transaction. Allah's response is real, even when the timing or form is not what the person first imagined.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What do you usually make dua for only after everything else fails? What would change if you treated dua as the first expression of dependence, not the last resort?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write three duas today: one for guidance, one for forgiveness, and one for a practical need. Begin by praising Allah before asking.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor dua as worship, reliance, and hope. Use them to keep dua sincere and hopeful, while asking scholars about wording or religious boundaries when unsure.",
      },
    ],
    reflectionQuestions: [
      "Where do you need to admit your need to Allah more honestly?",
      "Which dua would you make if you fully believed Allah hears you?",
    ],
    actionSteps: [
      "Write three personal duas and keep them in your prayer space.",
      "Begin one dua with praise of Allah and salawat.",
      "Repeat one dua for seven days without demanding a timeline.",
    ],
    quiz: [
      {
        question: "Why is dua more than a request list?",
        options: [
          "It is worship that expresses need and reliance on Allah",
          "It works only when all actions are abandoned",
          "It should be used only during emergencies",
        ],
        correctAnswer:
          "It is worship that expresses need and reliance on Allah",
        explanation:
          "Dua trains the servant to turn to Allah with humility, hope, and dependence in every state.",
      },
    ],
    audioScript:
      "Dua is worship. Ask Allah with need, praise, hope, and trust, not only when every worldly option feels closed.",
  },
  "dua-and-tawakkul-ch-2": {
    subtitle: "Ask with a heart that is present, honest, and hopeful",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Presence in dua does not mean the mind never wanders. It means the servant tries to know what they are asking, Who they are asking, and why they need Him. A rushed dua can still be sincere, but a present dua slows the heart enough to speak truthfully. The user should avoid vague autopilot when possible. Instead of only saying, 'fix everything,' they can name the need: guide me in this choice, protect my tongue, heal this family tension, make halal provision enough, help me leave this sin. Presence also includes hope. A believer does not need perfect emotions before making dua. The act of turning back is already a sign of life in the heart.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which dua have you repeated for a long time without slowing down to feel its meaning? What would you say if you spoke to Allah with full honesty today?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one dua and rewrite it in plain language first. Then make the dua in your own words and, where you know it, with the prophetic or Quranic wording.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards keep this chapter tied to hope, worship, and reliance. Personal trauma, despair, or intrusive thoughts may also need trusted human support, not isolation.",
      },
    ],
    reflectionQuestions: [
      "What need are you afraid to name clearly in dua?",
      "What helps your heart become more present before asking Allah?",
    ],
    actionSteps: [
      "Make one dua without multitasking.",
      "Name the need clearly before asking.",
      "End the dua with one sentence of trust in Allah's wisdom.",
    ],
    quiz: [
      {
        question: "What does presence in dua include?",
        options: [
          "Knowing what you ask and turning to Allah with hope",
          "Waiting until your emotions are perfect",
          "Never asking for practical worldly needs",
        ],
        correctAnswer: "Knowing what you ask and turning to Allah with hope",
        explanation:
          "Presence is an effort of the heart. A servant can ask for deen and dunya while trusting Allah's wisdom.",
      },
    ],
    audioScript:
      "Ask with presence. Name the need, know Who you are asking, and let hope return even if the heart feels tired.",
  },
  "dua-and-tawakkul-ch-3": {
    subtitle: "Rely on Allah while taking the responsible next step",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Tawakkul is not passivity. The famous meaning of tying the camel teaches that reliance belongs with responsible action. A student studies and asks Allah for success. A parent takes precautions and asks Allah for protection. A person seeking work applies through halal means and asks Allah for provision. The action does not replace trust, and trust does not excuse negligence. This balance protects the user from two mistakes: trying to control everything as if outcomes belong to the self, or doing nothing and calling it reliance. Tawakkul means the heart rests with Allah while the limbs take the lawful step in front of them.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where are you using planning to avoid trusting Allah, and where are you using 'trust' to avoid a responsibility you already know you should take?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one matter you are worried about. Under it, write two columns: what is my lawful next step, and what outcome must I leave with Allah?",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect reliance with Allah's sufficiency and hope. This chapter gives a spiritual decision frame, not legal, medical, or financial advice.",
      },
    ],
    reflectionQuestions: [
      "What is one lawful step you can take without trying to control the result?",
      "Which outcome do you need to release back to Allah?",
    ],
    actionSteps: [
      "Take one responsible action today.",
      "Make dua before and after the action.",
      "Write down what remains outside your control.",
    ],
    quiz: [
      {
        question: "What is the balanced meaning of tawakkul in action?",
        options: [
          "Take lawful means while trusting Allah with the outcome",
          "Do nothing and call it spirituality",
          "Believe planning controls every result",
        ],
        correctAnswer:
          "Take lawful means while trusting Allah with the outcome",
        explanation:
          "Tawakkul joins responsible effort with a heart that knows outcomes belong to Allah.",
      },
    ],
    audioScript:
      "Tie the camel, then trust Allah. Take the lawful step, and let the outcome return to the One who controls all things.",
  },
  "dua-and-tawakkul-ch-4": {
    subtitle: "Keep hope when the answer is delayed or different",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A delayed answer can test the heart more than a denied request. The user may wonder whether Allah heard them, whether they asked wrongly, or whether hope is foolish. This chapter should protect the believer from despair without giving simplistic promises. Allah hears, knows, and responds with wisdom, but the response may come as what was requested, protection from harm, a better timing, a different door, growth through patience, or reward kept with Allah. The believer keeps asking while also reviewing the self: avoiding haram, repairing wrongs, taking lawful means, and asking with humility. Hope is not pretending pain is small. Hope is refusing to believe that Allah's mercy is absent.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which unanswered dua hurts the most right now? What would it mean to keep asking while also trusting that Allah sees more than you see?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make a delayed-dua note with three parts: what I am asking, what lawful step I can still take, and what mercy I can notice while waiting.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards point to hope and not despairing of Allah's mercy. If waiting has become emotionally unsafe or isolating, seek trusted support alongside dua.",
      },
    ],
    reflectionQuestions: [
      "What helps you keep adab with Allah while waiting?",
      "What mercy can you recognise even before the answer is clear?",
    ],
    actionSteps: [
      "Repeat one delayed dua after the next prayer.",
      "Take one lawful step connected to that dua.",
      "Speak to one trusted person if the waiting has become heavy.",
    ],
    quiz: [
      {
        question: "What should a believer avoid when a dua feels delayed?",
        options: [
          "Despairing of Allah's mercy",
          "Continuing to ask with humility",
          "Taking lawful steps while waiting",
        ],
        correctAnswer: "Despairing of Allah's mercy",
        explanation:
          "Delay is a test, not proof that Allah's mercy is absent. The believer keeps hope and adab.",
      },
    ],
    audioScript:
      "When the answer takes time, keep asking. Allah hears, Allah knows, and hope remains part of worship.",
  },
  "character-and-manners-ch-1": {
    subtitle: "Practise honesty where people may never check",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Truthfulness is not only tested in courtrooms or dramatic moments. It is tested in small edits: the excuse that sounds better than the truth, the message that hides what happened, the screenshot chosen to protect the ego, the promise made too quickly, the work hour rounded upward, or the apology that avoids responsibility. Character grows when the believer treats these small moments as worship. The source anchors around speech and the prophetic example remind the user that adab is not decoration. It is part of being safe for other people. A truthful person is not harsh or careless with secrets; truthfulness still needs wisdom, privacy, and mercy.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where are you most tempted to bend the truth: image, money, work, family, lateness, mistakes, or online presentation?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one small truth today. Correct a vague excuse, clarify a promise, admit a mistake, or stop presenting something in a way that misleads people.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect character with guarded speech, safety from harm, and the Messenger's example. Apply them with wisdom, not bluntness that creates unnecessary harm.",
      },
    ],
    reflectionQuestions: [
      "What small untruth has started to feel normal?",
      "How can you be truthful today without being needlessly harsh?",
    ],
    actionSteps: [
      "Correct one misleading statement or promise.",
      "Pause before giving an excuse today.",
      "Make dua for a tongue that is honest and merciful.",
    ],
    quiz: [
      {
        question: "Where does truthfulness often begin?",
        options: [
          "In small daily moments that shape trust",
          "Only in public speeches",
          "Only when someone catches a mistake",
        ],
        correctAnswer: "In small daily moments that shape trust",
        explanation:
          "Small choices train the tongue and heart. Truthfulness becomes character through repetition.",
      },
    ],
    audioScript:
      "Truthfulness is built in small moments. Tell the truth with wisdom, mercy, and awareness that Allah sees what people may never check.",
  },
  "character-and-manners-ch-2": {
    subtitle: "Make your tongue a place where people are safe",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Guarding the tongue is one of the clearest ways people feel a Muslim's character. Harm can leave through speech before the person has time to call it harm: sarcasm, backbiting, suspicion, insults, exposing faults, passing on private messages, or winning an argument by humiliating someone. The source cards warn against suspicion and backbiting and describe safety from the tongue and hand. This does not mean silence in the face of injustice or refusing needed advice. It means speech should be truthful, necessary, proportionate, and guided by taqwa. A beginner can start by pausing before forwarding, commenting, or repeating what would lower someone in another person's eyes.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which speech pattern causes the most damage around you: jokes, complaints, gossip, online comments, family criticism, or private screenshots?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Use a three-question filter once today: is it true, is it needed, and can it be said with adab? If not, leave it or reword it.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to treat speech as a trust. Serious abuse, safety, or rights issues still need appropriate help and should not be hidden under false politeness.",
      },
    ],
    reflectionQuestions: [
      "Who feels safest around your speech?",
      "Which situation makes your tongue move before your taqwa catches up?",
    ],
    actionSteps: [
      "Leave one unnecessary comment unsaid today.",
      "Refuse to pass on one piece of gossip.",
      "Repair one sentence if you spoke unfairly.",
    ],
    quiz: [
      {
        question: "What is a practical filter before speaking?",
        options: [
          "Is it true, needed, and said with adab?",
          "Will it make me look clever?",
          "Can I win the argument quickly?",
        ],
        correctAnswer: "Is it true, needed, and said with adab?",
        explanation:
          "Guarded speech is not silence always. It is speech shaped by truth, need, and mercy.",
      },
    ],
    audioScript:
      "Let people be safe from your tongue. Pause before speech, protect honour, and speak only with truth and adab.",
  },
  "character-and-manners-ch-3": {
    subtitle: "Let success make you grateful, not inflated",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Humility is tested when things go well. Praise, grades, money, influence, beauty, knowledge, followers, or religious consistency can quietly become a mirror the nafs loves. A Muslim does not deny blessings or pretend incompetence. Humility means seeing the blessing as from Allah, using it responsibly, and refusing to look down on people who have not been given the same thing. The prophetic example is the standard: strength with mercy, leadership with service, knowledge with gentleness. When the user wins, the question is not only 'what did I achieve?' but 'did this achievement make me more grateful, more useful, and less arrogant?'",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which blessing most easily makes you compare yourself to others: knowledge, work, appearance, worship, family, money, or online attention?",
      },
      {
        type: "action",
        heading: "Act",
        body: "After one success today, say alhamdulillah, name who helped you, and do one small act of service that nobody needs to praise.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards point to the prophetic example and to character people can feel. Let success become gratitude and service rather than superiority.",
      },
    ],
    reflectionQuestions: [
      "What success has Allah given you that needs more gratitude?",
      "Who could benefit from your blessing without being made to feel small?",
    ],
    actionSteps: [
      "Thank Allah for one specific blessing.",
      "Credit one person who helped you.",
      "Do one useful act quietly without posting it.",
    ],
    quiz: [
      {
        question: "What should success produce in a believer?",
        options: [
          "Gratitude, service, and humility",
          "Looking down on people",
          "Pretending blessings do not exist",
        ],
        correctAnswer: "Gratitude, service, and humility",
        explanation:
          "Humility recognises blessings as from Allah and turns them toward service instead of arrogance.",
      },
    ],
    audioScript:
      "When Allah gives you a win, let it make you grateful. Use the blessing to serve, not to rise over people.",
  },
  "character-and-manners-ch-4": {
    subtitle: "Become someone people can trust with duties and promises",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Reliability is worship when it protects people's rights. It shows up in arriving when promised, replying when needed, paying what is owed, finishing work honestly, keeping private matters private, and admitting early when something cannot be done. Some people imagine good character as only being warm or polite, but unreliable warmth still hurts people. A believer's manners should reduce the burden on others. This chapter helps the user treat promises as amanah. That does not mean saying yes to everything. Reliability may require clearer boundaries, fewer promises, better calendars, and honest communication before a delay becomes harm.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where do people have to chase you most: time, replies, payments, borrowed items, tasks, family duties, or promises you made too quickly?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one open loop today and close it: reply, return, pay, apologise, schedule, or clearly renegotiate what you cannot fulfil.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect character with safety from harm and the prophetic model. Reliability is one way people experience your Islam before they hear your words.",
      },
    ],
    reflectionQuestions: [
      "Which promise or duty needs repair today?",
      "What boundary would stop you from overpromising next time?",
    ],
    actionSteps: [
      "Close one delayed responsibility today.",
      "Set one reminder for a duty people rely on you for.",
      "Say no clearly to one request you cannot fulfil well.",
    ],
    quiz: [
      {
        question: "Why is reliability part of character?",
        options: [
          "It protects people's rights and reduces harm",
          "It means accepting every request",
          "It only matters at work, not family",
        ],
        correctAnswer: "It protects people's rights and reduces harm",
        explanation:
          "Reliable people guard promises and responsibilities. Sometimes that includes honest boundaries.",
      },
    ],
    audioScript:
      "Reliability is adab people can feel. Close the loop, keep the promise, or speak honestly before delay becomes harm.",
  },
  "new-muslim-starter-guide-ch-1": {
    subtitle: "Begin with welcome, purpose, and a steady first intention",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Entering Islam is not entering a race where everyone expects instant perfection. It is a return to Allah, a new direction for worship, and the beginning of a life that can be learned step by step. A new Muslim needs welcome, clarity, and calm structure. The shahadah opens the door, but the first days after it should be protected from overwhelm: learn who Allah is, protect the next prayer as best as you can, keep asking questions, and find trustworthy Muslim support. The source anchors help keep the beginning sincere. Intention matters, and life has a purpose beyond pressure, image, or other people's timelines. You are allowed to be a learner while still taking Islam seriously.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Notice what you feel when you think about being Muslim: relief, fear, joy, pressure, confusion, loneliness, gratitude, or all of them at once. None of those feelings cancel your Islam. They show where you need gentleness, knowledge, and support.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one first-week intention: I want to learn Islam sincerely, protect my prayer, and ask for help without shame. Keep it somewhere private and review it at the end of the week.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect this beginning to intention and purpose. This chapter gives orientation for new Muslims, not final rulings on family, marriage, purification, finance, or personal circumstances.",
      },
    ],
    reflectionQuestions: [
      "What emotion is strongest for you right now as a new or returning Muslim?",
      "Who could be a safe, knowledgeable person to help you learn without overwhelming you?",
    ],
    actionSteps: [
      "Write a one-sentence intention for your first week.",
      "Choose one trustworthy mosque, teacher, class, or Muslim friend for support.",
      "Make one simple dua asking Allah for guidance and steadiness.",
    ],
    quiz: [
      {
        question: "What is the healthiest first posture for a new Muslim?",
        options: [
          "Learn sincerely and grow step by step",
          "Pretend to know everything immediately",
          "Delay all worship until every detail is mastered",
        ],
        correctAnswer: "Learn sincerely and grow step by step",
        explanation:
          "A new Muslim should take Islam seriously while learning with patience, support, and sincere intention.",
      },
    ],
    audioScript:
      "Welcome to Islam. Begin with sincerity, purpose, and one steady next step. You are not expected to know everything on the first day.",
  },
  "new-muslim-starter-guide-ch-2": {
    subtitle: "Prioritise foundations so the first weeks feel possible",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The first learning plan should protect foundations before details multiply. Start with belief in Allah, the meaning of the shahadah, the basics of salah, how to make wudu, a short Quran routine, and the character Islam asks you to build. Do not try to answer every advanced debate, social-media argument, or legal edge case in the first week. A strong beginner path asks: what do I need to worship Allah today, avoid obvious harm, and keep learning tomorrow? Intention keeps learning sincere, and purpose keeps it from becoming only information. Where exact rulings are needed, especially around purification, family, marriage, work, food, or finances, ask a qualified teacher instead of relying on guesses.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "List the questions currently filling your mind. Mark each one as urgent for worship today, important for this month, or something that can wait until you have stronger foundations.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make a first-month learning list with five anchors: shahadah meaning, wudu, salah basics, one short surah or dua, and one reliable person to ask questions.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards keep the learning plan tied to intention and worship. Use them as anchors, then learn exact practice from qualified people and reliable beginner material.",
      },
    ],
    reflectionQuestions: [
      "Which foundation would make worship easier this week?",
      "Which question feels urgent emotionally but can safely wait while you learn the basics?",
    ],
    actionSteps: [
      "Create a first-month learning list with five foundations.",
      "Book or attend one beginner class or mosque conversation.",
      "Put advanced debates aside until daily worship is more stable.",
    ],
    quiz: [
      {
        question: "What should a new Muslim prioritise first?",
        options: [
          "Belief, prayer basics, Quran contact, character, and trusted guidance",
          "Every advanced debate online",
          "Only cultural details with no worship plan",
        ],
        correctAnswer:
          "Belief, prayer basics, Quran contact, character, and trusted guidance",
        explanation:
          "Foundations give the new Muslim a stable path. Complex rulings and debates should be handled with qualified guidance over time.",
      },
    ],
    audioScript:
      "Learn the foundations first: belief, wudu, prayer, Quran, character, and a reliable person to ask. Islam is learned one trustworthy step at a time.",
  },
  "new-muslim-starter-guide-ch-3": {
    subtitle: "Start salah with remembrance, learning, and mercy",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Salah is one of the first major practices a new Muslim meets, and it can feel both beautiful and intimidating. The Quran source anchors show that prayer is established for Allah's remembrance and that prayer should shape conduct. This means salah is not only a set of movements to memorise; it is a daily return to Allah that slowly trains the heart and behaviour. Start by learning the prayer times, wudu, the broad movement order, Al-Fatihah, and a few essential words with a teacher or reliable beginner guide. Do not let imperfect pronunciation or nervousness keep you away from the next prayer. Pray as you learn, ask specific questions, and let small regular effort build confidence.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which part of salah currently feels most difficult: timing, wudu, Arabic words, movements, concentration, family pressure, or fear of doing it wrong?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Protect the next prayer rather than trying to solve the whole future. Set the time, prepare wudu, follow a trusted guide, and write one question to ask afterward.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect salah with remembrance, character, and small regular deeds. Exact prayer details, missed prayers, purification issues, travel, illness, and gender-specific questions need qualified instruction.",
      },
    ],
    reflectionQuestions: [
      "What would make the next prayer easier to begin?",
      "What question about salah should you ask a teacher instead of carrying alone?",
    ],
    actionSteps: [
      "Set reminders for the next prayer time.",
      "Practise wudu and the broad prayer order using a trusted guide.",
      "Ask one specific salah question this week.",
    ],
    quiz: [
      {
        question: "How should a new Muslim approach early salah practice?",
        options: [
          "Pray, keep learning, and ask qualified people about details",
          "Avoid prayer until every detail feels perfect",
          "Treat prayer as only a cultural routine",
        ],
        correctAnswer:
          "Pray, keep learning, and ask qualified people about details",
        explanation:
          "Salah is learned with practice, correction, and mercy. New Muslims should not be frozen by early uncertainty.",
      },
    ],
    audioScript:
      "Start with the next prayer. Learn the time, make wudu, stand before Allah, and keep asking for guidance as you grow.",
  },
  "new-muslim-starter-guide-ch-4": {
    subtitle: "Handle pressure with mercy, boundaries, and safe support",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Family and community pressure can be one of the hardest parts of becoming Muslim. Some users face confusion, questions, jokes, anger, isolation, or pressure to hide. The first rule is not to turn every conversation into a battle. Keep intention sincere, remember your purpose, and speak with as much mercy and clarity as the situation allows. At the same time, mercy does not mean accepting harm or giving up essential worship. Build a support circle: one trusted Muslim, one knowledgeable teacher, and one safe person who understands your home situation. If pressure becomes threatening, abusive, or unsafe, seek real help locally and do not rely on an app lesson alone.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Map the people around you into three groups: supportive, confused but reachable, and unsafe or high-conflict. Each group needs a different communication plan.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Prepare one calm sentence for family questions: I am learning Islam sincerely, I still care about you, and I may need time to answer some questions properly.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor this chapter in intention and life purpose. Personal safety, family conflict, marriage, housing, and legal concerns need qualified local support and should not be handled by generic guidance.",
      },
    ],
    reflectionQuestions: [
      "Who is safe enough to know more about your journey right now?",
      "Where do you need a boundary rather than another argument?",
    ],
    actionSteps: [
      "Write one calm answer for common family questions.",
      "Identify one trusted Muslim support contact.",
      "Seek local help immediately if family pressure becomes unsafe.",
    ],
    quiz: [
      {
        question: "What is the safest response to serious family pressure?",
        options: [
          "Use mercy, boundaries, and trusted local support",
          "Handle every conflict alone",
          "Turn every conversation into an argument",
        ],
        correctAnswer: "Use mercy, boundaries, and trusted local support",
        explanation:
          "A new Muslim should speak with adab while also protecting safety, worship, and access to qualified guidance.",
      },
    ],
    audioScript:
      "Family pressure needs mercy and wisdom, but not isolation. Keep your intention clear, speak calmly where possible, and build safe support.",
  },
  "repentance-and-returning-ch-1": {
    subtitle: "Return quickly before shame turns one fall into distance",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Tawbah begins by refusing to let a fall become a new identity. The Quran source on not despairing of Allah's mercy is a lifeline for the person who thinks they have gone too far, while the source on responsibility reminds them not to carry more than Allah placed on them. Returning quickly means stopping the wrong as soon as you recognise it, turning to Allah, and making a sincere intention to repair what can be repaired. It does not mean pretending the sin was harmless, and it does not mean waiting until you feel spiritually clean enough to speak to Allah. Shame can delay return; tawbah cuts through delay by coming back before the heart gets used to distance.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What usually happens after you slip: immediate return, hiding, self-attack, more sin because you feel ruined, or pretending nothing happened?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a return script for the next slip: stop, make istighfar, pray if it is prayer time, remove the trigger, and write the next responsible step.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor hope, responsibility, and intention. This is spiritual coaching, not a ruling on expiation, legal rights, addictions, or harm done to others.",
      },
    ],
    reflectionQuestions: [
      "What phrase does shame use to keep you from returning quickly?",
      "What is the first small action that proves you are returning, not giving up?",
    ],
    actionSteps: [
      "Write a five-step return script.",
      "Make istighfar now for anything you have delayed.",
      "Remove or reduce one trigger before the day ends.",
    ],
    quiz: [
      {
        question: "What should a believer avoid after a slip?",
        options: [
          "Letting shame delay return to Allah",
          "Making sincere tawbah",
          "Taking a responsible next step",
        ],
        correctAnswer: "Letting shame delay return to Allah",
        explanation:
          "Tawbah should begin quickly. Despair and delay can make one mistake turn into deeper distance.",
      },
    ],
    audioScript:
      "Do not wait until you feel worthy to return. Stop, ask Allah for forgiveness, and take the next responsible step back.",
  },
  "repentance-and-returning-ch-2": {
    subtitle: "Let regret soften the heart without crushing hope",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Regret can be a mercy when it wakes the heart up. It becomes harmful when it turns into despair, self-hatred, or the belief that Allah's mercy is closed. A repentant person should feel the seriousness of disobedience, but the Quran source on mercy prevents that seriousness from becoming hopelessness. Healthy regret says: this mattered, I should not repeat it, and I need Allah's forgiveness. Despair says: I am finished, so why try? This chapter trains the difference. Let regret make you honest, not paralysed. Let hope make you return, not careless. If the pattern involves addiction, self-harm, trauma, or dangerous secrecy, include trusted human help alongside tawbah.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Listen to your inner voice after a mistake. Does it lead you back to Allah, or does it push you into hiding and more damage?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write two sentences: one honest regret for the wrong, and one hopeful sentence about Allah's mercy. Keep both together so neither denial nor despair takes over.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards protect both seriousness and hope. This chapter should not be used as mental-health care, crisis support, or legal advice where those are needed.",
      },
    ],
    reflectionQuestions: [
      "Does your regret move you toward Allah or away from Him?",
      "What support would help you return without hiding?",
    ],
    actionSteps: [
      "Write one sentence of regret and one sentence of hope.",
      "Make dua for a heart that feels remorse without despair.",
      "Contact trusted support if the pattern feels unsafe or compulsive.",
    ],
    quiz: [
      {
        question: "What is healthy regret supposed to do?",
        options: [
          "Wake the heart and lead it back to Allah",
          "Convince a person Allah will never forgive them",
          "Make the sin feel meaningless",
        ],
        correctAnswer: "Wake the heart and lead it back to Allah",
        explanation:
          "Regret should create honest tawbah. It should not become despair of Allah's mercy.",
      },
    ],
    audioScript:
      "Let regret wake you up, not bury you. Allah's mercy is not closed to the one who returns sincerely.",
  },
  "repentance-and-returning-ch-3": {
    subtitle: "Repair rights and damage with honesty and qualified help",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Some repentance is mostly between the servant and Allah. Some also involves people who were harmed, rights that were taken, money that must be returned, lies that must be corrected, or trust that needs rebuilding. Repairing what you can is part of sincere return, but it needs wisdom. A careless confession can sometimes create more harm, while avoiding repair can leave injustice unresolved. Start with what is clear: stop the harm, return what is owed when possible, apologise without excuses where appropriate, correct falsehood, and ask a qualified scholar or trusted adviser about complicated cases. The source on intention matters here: repair should be for Allah and the right of others, not only to relieve your own guilt.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Name the type of repair involved: Allah's right, another person's property, another person's honour, a broken promise, a family duty, or a private habit that needs barriers.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make a repair map with three columns: what happened, who or what has a right, and what next step is safe, lawful, and wise.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor repentance in hope, responsibility, and intention. Cases involving money, marriage, abuse, public harm, contracts, or legal exposure require qualified guidance before acting.",
      },
    ],
    reflectionQuestions: [
      "Who or what has a right connected to this mistake?",
      "Where do you need a scholar or trusted adviser before trying to repair it alone?",
    ],
    actionSteps: [
      "Write a three-column repair map.",
      "Complete one clear repair step that will not create new harm.",
      "Ask qualified guidance about any complicated rights issue.",
    ],
    quiz: [
      {
        question: "What does repairing what you can require?",
        options: [
          "Honesty, wisdom, and qualified help for complex rights",
          "Only feeling bad privately",
          "Careless confession without considering harm",
        ],
        correctAnswer: "Honesty, wisdom, and qualified help for complex rights",
        explanation:
          "Sincere repentance can include repair, but rights and harms must be handled carefully and with proper guidance.",
      },
    ],
    audioScript:
      "Repair what you can with honesty and wisdom. Return rights, correct harm, and ask qualified help when the case is complicated.",
  },
  "repentance-and-returning-ch-4": {
    subtitle: "Build barriers, routines, and support after tawbah",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Returning is not complete if the person walks straight back into the same open door without a plan. Protection after tawbah means identifying triggers, changing access, building better routines, and replacing the old path with worship, good company, rest, exercise, useful work, Quran, or service. The source on Allah not burdening a soul beyond capacity should not be used as an excuse to avoid effort; it should help the user build a realistic plan instead of an impossible one. Protection often looks ordinary: phone limits, fewer private late-night moments, a blocked account, a trusted check-in, sleeping earlier, leaving a gathering, or asking for specialist help where addiction or harm is involved.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Look at the last three slips. What pattern appears before them: time, place, emotion, person, app, tiredness, anger, loneliness, money pressure, or secrecy?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one protection barrier for the next seven days. Make it visible, measurable, and realistic enough to keep even when motivation drops.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect protection to hope, responsibility, and sincere intention. Persistent compulsive behaviour, danger, or serious harm needs qualified spiritual and professional support.",
      },
    ],
    reflectionQuestions: [
      "Which trigger needs a barrier this week?",
      "What good replacement can fill the space that the old habit used to take?",
    ],
    actionSteps: [
      "Identify one repeated trigger.",
      "Install or practise one barrier for seven days.",
      "Choose one trusted person or support route for accountability.",
    ],
    quiz: [
      {
        question: "What should come after sincere tawbah?",
        options: [
          "A realistic protection plan against repeat triggers",
          "Walking back into the same setup with no changes",
          "Despairing after the first difficult day",
        ],
        correctAnswer: "A realistic protection plan against repeat triggers",
        explanation:
          "Tawbah should be followed by practical barriers, better routines, and support where needed.",
      },
    ],
    audioScript:
      "After tawbah, build protection. Close one door, replace one habit, and ask Allah for steadiness with a plan you can actually keep.",
  },
  "islam-for-curious-non-muslims-ch-1": {
    subtitle: "Meet Islam through worship of one God and a purposeful life",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A respectful introduction to Islam should begin with the centre: Muslims worship Allah, the one God, without partners. Islam is not first a culture, ethnicity, political label, or inherited identity. It is submission to Allah through belief, worship, character, and a life directed toward accountability and mercy. The source cards anchor this chapter in intention and purpose. Muslims believe that human life is not accidental or only material; it has meaning because the Creator made people to know and worship Him. This chapter is not trying to force a conclusion. It gives the user a clear doorway: if Islam is true, worship and daily choices should be shaped by the One who created them.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Ask what you already associate with Islam, then separate direct Islamic belief from culture, news, family stories, online arguments, and personal experience with Muslims.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write three questions you genuinely want answered about God, worship, purpose, or accountability. Keep them honest rather than trying to win an argument.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to connect belief with purpose and intention. Detailed theology, comparative religion, and personal conversion decisions should be explored with reliable teachers and sincere study.",
      },
    ],
    reflectionQuestions: [
      "What do you think worship means before learning the Islamic view?",
      "Which ideas about Islam came from Muslims, and which came from media or assumptions?",
    ],
    actionSteps: [
      "Write three sincere questions about Islam.",
      "Read one short Quran translation passage about purpose.",
      "Speak to a knowledgeable Muslim without turning the conversation into a debate.",
    ],
    quiz: [
      {
        question: "What is the centre of Islamic belief introduced here?",
        options: [
          "Worship of Allah alone and a purposeful life",
          "Belonging to one ethnicity",
          "Winning arguments about religion",
        ],
        correctAnswer: "Worship of Allah alone and a purposeful life",
        explanation:
          "Islam begins with worship of Allah alone and a life shaped by sincere intention, accountability, and guidance.",
      },
    ],
    audioScript:
      "Begin with the centre: Muslims worship Allah alone and see life as purposeful, accountable, and directed back to the Creator.",
  },
  "islam-for-curious-non-muslims-ch-2": {
    subtitle: "Understand the Quran as recited guidance, not a slogan",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The Quran is the central revelation of Islam: recited, memorised, studied, prayed with, and returned to across Muslim life. A curious reader should not treat it as a quote collection or a text to judge only through fragments online. Begin by reading a reliable translation with humility, listening to recitation, and noticing the Quran's repeated concerns: worship of Allah, guidance, mercy, accountability, stories of earlier peoples, moral conduct, and the life of the hereafter. The source cards encourage Quran engagement according to ability and seeking paths of knowledge. A first encounter does not need to answer every advanced question; it should build enough contact to ask better questions.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Notice how you usually approach scripture: as literature, law, comfort, evidence, history, or something unfamiliar. Then ask what it would mean to read as someone seeking guidance.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Read a short passage from a reliable Quran translation while also listening to Arabic recitation. Write one question and one line that stayed with you.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support regular Quran contact and seeking knowledge. Tafsir, Arabic depth, legal extraction, and contested interpretations should be learned through reliable scholarship.",
      },
    ],
    reflectionQuestions: [
      "What changes when you listen to Quran recitation instead of only reading a translation?",
      "Which question would help you understand the Quran more fairly?",
    ],
    actionSteps: [
      "Read one short Quran passage in translation.",
      "Listen to the same passage in Arabic recitation.",
      "Write one honest question to bring to a reliable teacher or study circle.",
    ],
    quiz: [
      {
        question: "How should a beginner approach the Quran?",
        options: [
          "Read and listen carefully while seeking reliable knowledge",
          "Judge it only from isolated online fragments",
          "Avoid all questions and never study context",
        ],
        correctAnswer:
          "Read and listen carefully while seeking reliable knowledge",
        explanation:
          "A fair first encounter combines Quran contact, humility, questions, and reliable scholarship.",
      },
    ],
    audioScript:
      "The Quran is recited guidance. Read a little, listen carefully, and let sincere questions lead you toward reliable knowledge.",
  },
  "islam-for-curious-non-muslims-ch-3": {
    subtitle: "See prayer as remembrance, humility, and daily orientation",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Muslims pray because worship is not meant to remain abstract. Salah gives the day repeated moments of remembrance, humility, gratitude, repentance, and return to Allah. From the outside, prayer may look like movements and Arabic words. From the inside, it is a structured meeting with the Creator: standing, reciting, bowing, prostrating, sitting, and ending in peace. The source cards connect worship with intention and purpose, so prayer should be understood as part of a whole life, not a disconnected ritual. A curious visitor does not need to know every legal detail to understand the broad meaning: prayer trains the Muslim to keep returning to Allah before the day carries them away.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Think about what shapes your day right now: work, phone, family, stress, goals, or habit. What would change if the day had repeated pauses for worship and accountability?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Watch or attend one prayer respectfully. Notice silence, rows, bowing, prostration, and the way the whole body is included in worship.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor prayer in purpose and intention. Exact prayer method, purification, missed prayers, and legal details belong in a beginner worship guide or qualified teaching setting.",
      },
    ],
    reflectionQuestions: [
      "What part of Muslim prayer feels most unfamiliar to you?",
      "What daily habit currently gives your life direction?",
    ],
    actionSteps: [
      "Observe one prayer respectfully in person or through a trusted educational resource.",
      "Write what the movements seem to communicate about humility.",
      "Ask one Muslim what prayer means to them personally.",
    ],
    quiz: [
      {
        question: "Why is Muslim prayer more than a public ritual?",
        options: [
          "It is repeated worship that orients the body and heart to Allah",
          "It is only exercise",
          "It is only a cultural greeting",
        ],
        correctAnswer:
          "It is repeated worship that orients the body and heart to Allah",
        explanation:
          "Salah turns worship into daily remembrance, humility, and return to Allah.",
      },
    ],
    audioScript:
      "Prayer is a daily return. The Muslim stands, bows, and prostrates so worship becomes part of the whole body and schedule.",
  },
  "islam-for-curious-non-muslims-ch-4": {
    subtitle: "Visit with respect, curiosity, and simple adab",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A mosque visit should feel welcoming, but it also deserves respect because it is a place of worship. The safest first step is to check the mosque website or contact someone before visiting, especially for Friday prayer or a busy event. Dress modestly, arrive a little early, remove shoes where people remove shoes, keep your phone quiet, and ask before taking photos. Men and women may have separate prayer spaces depending on the mosque. If you are not Muslim, you can usually observe quietly from an appropriate place, but you should follow local guidance. The deeper adab is intention: come to understand, not to mock, film, provoke, or treat worshippers as a spectacle.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What would help you feel comfortable visiting: going with a Muslim friend, calling ahead, attending an open day, or reading basic mosque etiquette first?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Find a local mosque open day, visitor guide, or contact email. Prepare two respectful questions before going.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards remind the visitor that intention and purpose matter. Local mosque rules, security policies, prayer-space arrangements, and community norms should be followed directly.",
      },
    ],
    reflectionQuestions: [
      "What intention would make a mosque visit respectful?",
      "What practical question should you ask the mosque before attending?",
    ],
    actionSteps: [
      "Check the mosque's visitor information or contact page.",
      "Prepare modest clothing and silence your phone before entering.",
      "Ask before taking photos or entering prayer-only areas.",
    ],
    quiz: [
      {
        question: "What is the best first step before visiting a mosque?",
        options: [
          "Check local visitor guidance and come respectfully",
          "Film people without asking",
          "Interrupt the prayer to ask questions",
        ],
        correctAnswer: "Check local visitor guidance and come respectfully",
        explanation:
          "Mosques are places of worship. Visitors should follow local guidance, dress modestly, and observe with respect.",
      },
    ],
    audioScript:
      "Visit a mosque with respect. Check ahead, dress modestly, keep the phone quiet, and come to understand rather than perform curiosity.",
  },
  "anxiety-sabr-and-tawakkul-ch-1": {
    subtitle: "Name anxiety honestly without turning it into an identity",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A person can feel anxiety and still have iman. Worry, tightness in the body, racing thoughts, disrupted sleep, and fear about the future are real experiences, not proof that someone is spiritually broken. Naming the weight is the first act of honesty: what am I carrying, when does it rise, and what does it make me avoid? The source cards point to patience, prayer, responsibility, and hope. They should not be used to shame the user into silence. This chapter helps the user describe the burden clearly so worship, planning, support, and professional care can meet the real situation. If anxiety includes thoughts of self-harm, danger, or losing control, seek immediate local emergency or crisis support.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Describe the anxiety in plain language: where it appears in the body, what thoughts repeat, what situations trigger it, and what it stops you from doing.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a four-line anxiety note: what I feel, when it appears, what I need to do next, and who I can contact if it becomes too heavy.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards offer spiritual anchors for patience, prayer, and hope. This chapter is not medical diagnosis or treatment advice, and urgent safety concerns require real local help.",
      },
    ],
    reflectionQuestions: [
      "What does anxiety make you avoid even when the task matters?",
      "Who can you contact if the weight becomes unsafe or isolating?",
    ],
    actionSteps: [
      "Write the four-line anxiety note.",
      "Make a short dua asking Allah for steadiness and clarity.",
      "Save one trusted support contact outside the app.",
    ],
    quiz: [
      {
        question: "What is true about anxiety and faith?",
        options: [
          "Feeling anxiety does not mean someone has no iman",
          "Anxiety is always proof of spiritual failure",
          "A person should never seek support",
        ],
        correctAnswer: "Feeling anxiety does not mean someone has no iman",
        explanation:
          "Anxiety is a real human experience. Spiritual anchors can help, and serious distress may also need trusted or professional support.",
      },
    ],
    audioScript:
      "Name the weight without shame. Anxiety is not your whole identity, and returning to Allah can sit beside practical support.",
  },
  "anxiety-sabr-and-tawakkul-ch-2": {
    subtitle: "Practise patience as steady action, not silent suffering",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Sabr is often misunderstood as doing nothing while pain continues. In Islamic practice, sabr includes restraint from what harms, steadiness in what Allah loves, and endurance through what cannot immediately be changed. The source card that connects patience and prayer gives a practical direction: seek help through worship and disciplined action. For anxiety, active sabr may mean praying one prayer on time, taking medication as prescribed, attending therapy, reducing a trigger, breathing before replying, asking for help, sleeping earlier, or leaving a harmful situation. Sabr is not a command to stay unsafe or pretend the burden is small. It is the strength to take the next right step with Allah in view.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where have you mistaken sabr for silence, avoidance, or carrying everything alone? What would active patience look like today?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one active-sabr step: pray, message support, clean one small space, reduce one trigger, eat, rest, book help, or complete one necessary task.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect sabr with prayer, responsibility, and hope. They do not require someone to remain in danger or reject appropriate professional care.",
      },
    ],
    reflectionQuestions: [
      "What is one patient action you can take instead of only enduring?",
      "What harm should you not excuse under the word sabr?",
    ],
    actionSteps: [
      "Choose one active-sabr step for today.",
      "Pair it with one short dua before or after doing it.",
      "Tell one trusted person if you are carrying too much alone.",
    ],
    quiz: [
      {
        question: "What does active sabr include?",
        options: [
          "Steady worship and responsible next steps",
          "Ignoring danger or serious distress",
          "Doing nothing and calling it patience",
        ],
        correctAnswer: "Steady worship and responsible next steps",
        explanation:
          "Sabr includes restraint, worship, endurance, and wise action. It is not a command to stay unsafe.",
      },
    ],
    audioScript:
      "Sabr is not passive suffering. Seek help through prayer, take the next responsible step, and do not carry danger alone.",
  },
  "anxiety-sabr-and-tawakkul-ch-3": {
    subtitle: "Trust Allah while taking the means in front of you",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Tawakkul does not mean abandoning planning, treatment, study, money decisions, or support. It means the heart depends on Allah while the person takes lawful and responsible means. Anxiety often tries to control outcomes before they arrive. Tawakkul gives the user a different posture: do what is in your care, ask Allah for help, and release what was never under your control. The source cards remind the user that Allah does not burden a soul beyond what it can bear and that despair should not become the final story. A practical tawakkul plan separates the next action from the final result. The action belongs to your responsibility; the outcome belongs to Allah's wisdom.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Choose one worry and divide it into three parts: what I can do, what I can ask help with, and what I must leave with Allah.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make a tawakkul table for one worry. Complete one action from the first column today, then make dua before leaving the outcome with Allah.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support hope and responsibility. This chapter offers a spiritual decision frame, not financial, medical, legal, or clinical advice.",
      },
    ],
    reflectionQuestions: [
      "What part of this worry is actually yours to act on?",
      "What result are you trying to control that belongs with Allah?",
    ],
    actionSteps: [
      "Write one worry in a three-column tawakkul table.",
      "Do one lawful next action.",
      "Make dua and name the outcome you are leaving with Allah.",
    ],
    quiz: [
      {
        question: "What is tawakkul with action?",
        options: [
          "Taking lawful means while trusting Allah with outcomes",
          "Refusing all planning or support",
          "Believing you control every result",
        ],
        correctAnswer: "Taking lawful means while trusting Allah with outcomes",
        explanation:
          "Tawakkul joins responsible effort with a heart that knows outcomes belong to Allah.",
      },
    ],
    audioScript:
      "Take the means, ask Allah for help, and let the outcome return to Him. That is tawakkul with action.",
  },
  "anxiety-sabr-and-tawakkul-ch-4": {
    subtitle: "Know when spiritual support must be joined by human help",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Seeking support is not a betrayal of tawakkul. Allah places help in people, knowledge, medicine, family, professionals, teachers, and community. A user should seek extra support when anxiety disrupts sleep, work, worship, eating, family life, safety, or the ability to function, or when fear feels constant and unmanageable. Start with one trusted person, then consider a qualified mental-health professional, doctor, counsellor, imam, or community support route depending on the situation. If there is immediate danger, self-harm, abuse, or fear of harming someone else, use local emergency or crisis services now. Prayer and dua remain important, but they are not a reason to refuse the help Allah made available.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Ask honestly: is this weight private but manageable, heavy and needing support, or urgent and unsafe? Different levels require different actions.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a support ladder: one friend or family contact, one spiritual support contact, one professional or health contact, and one emergency option for urgent danger.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor hope, prayer, and not being overwhelmed. The app is not a crisis service; urgent safety concerns must go to local emergency or crisis support.",
      },
    ],
    reflectionQuestions: [
      "What sign would tell you this anxiety needs more help than private coping?",
      "Who belongs on your support ladder before a hard day arrives?",
    ],
    actionSteps: [
      "Write a four-level support ladder.",
      "Message one safe person if you have been isolated.",
      "Use emergency or crisis support immediately if there is danger.",
    ],
    quiz: [
      {
        question: "When should a person seek urgent outside help?",
        options: [
          "When there is immediate danger, self-harm, abuse, or risk of harm",
          "Never, because dua replaces all human help",
          "Only after the problem disappears",
        ],
        correctAnswer:
          "When there is immediate danger, self-harm, abuse, or risk of harm",
        explanation:
          "Spiritual care and human help can work together. Urgent danger requires real emergency or crisis support.",
      },
    ],
    audioScript:
      "Support is part of mercy. Keep dua, keep prayer, and reach for trusted or professional help when the weight becomes too heavy or unsafe.",
  },
  "ramadan-preparation-ch-1": {
    subtitle: "Prepare for taqwa before schedules and menus take over",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Ramadan preparation begins with the heart because fasting was prescribed for taqwa, not only for hunger. Before the month arrives, the user should ask what fasting is meant to train: awareness of Allah, restraint, gratitude, prayer, mercy, repentance, and patience. This does not mean ignoring logistics. Sleep, work, school, medication, family duties, meals, and mosque plans all matter. But the logistics should serve the spiritual aim instead of replacing it. A strong preparation plan names one sin to reduce, one worship habit to protect, one relationship to improve, and one practical barrier that usually weakens Ramadan. If the user has illness, pregnancy, menstruation, travel, medication, or fasting exemptions, they should ask qualified guidance before making private rulings.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Think about last Ramadan or the last month of worship you tried to improve. What helped your taqwa, and what quietly pulled the month toward tiredness, food, arguments, or screens?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a Ramadan intention card with four lines: one worship goal, one character goal, one family or community goal, and one practical obstacle to plan around.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor fasting in taqwa and help through patience and prayer. Personal fasting exemptions, make-up fasts, fidyah, medication, travel, and health cases require qualified advice.",
      },
    ],
    reflectionQuestions: [
      "What would make this Ramadan more sincere than performative?",
      "Which practical obstacle needs planning before the month begins?",
    ],
    actionSteps: [
      "Write one worship goal and one character goal.",
      "Plan around one sleep, food, work, or family obstacle.",
      "Ask qualified guidance early if fasting may affect your health or obligations.",
    ],
    quiz: [
      {
        question: "What is the core aim of Ramadan preparation here?",
        options: [
          "Taqwa supported by realistic planning",
          "Only food planning",
          "Publicly proving how much worship you do",
        ],
        correctAnswer: "Taqwa supported by realistic planning",
        explanation:
          "Fasting is connected to taqwa, and good planning helps the worship survive real life.",
      },
    ],
    audioScript:
      "Prepare for Ramadan by naming the taqwa you want to build, then shape your sleep, food, family, and worship plans around it.",
  },
  "ramadan-preparation-ch-2": {
    subtitle: "Choose a Quran plan that can survive real Ramadan days",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A Ramadan Quran plan should be ambitious enough to honour the month and realistic enough to continue after the first burst of energy. Some users can complete a full khatm with steady daily portions. Others need a plan built around recitation, listening, memorisation review, translation, tafsir lessons, or one surah studied deeply. The key is to decide before Ramadan begins: when will Quran happen, what amount will be read or listened to, and how will missed days be recovered without despair? Fasting trains restraint, and a Quran plan trains direction. Do not let a missed portion become a reason to abandon the whole month. Adjust, return, and keep the appointment with Allah's words.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Look at your actual Ramadan schedule. Which time is most protected for Quran: before Fajr, after Fajr, lunch break, before iftar, after taraweeh, or before sleep?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create three Quran targets: ideal day, tired day, and recovery day. This keeps the plan alive when energy changes.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect Ramadan to taqwa and seeking help through prayer and patience. Detailed tafsir, tajweed correction, and memorisation plans should use reliable teachers where possible.",
      },
    ],
    reflectionQuestions: [
      "What Quran amount can you protect on a tired day?",
      "Which part of the day is most likely to protect Quran from being pushed aside?",
    ],
    actionSteps: [
      "Set ideal, tired-day, and recovery-day Quran targets.",
      "Choose the exact daily Quran appointment time.",
      "Prepare the mushaf, app, audio, or translation before Ramadan begins.",
    ],
    quiz: [
      {
        question: "What makes a Quran plan resilient?",
        options: [
          "A realistic target with tired-day and recovery options",
          "A huge target with no recovery plan",
          "Waiting until the month starts to decide anything",
        ],
        correctAnswer: "A realistic target with tired-day and recovery options",
        explanation:
          "A resilient plan keeps the user connected to Quran even when energy, work, or family duties change.",
      },
    ],
    audioScript:
      "Design your Quran plan before Ramadan begins: an ideal day, a tired day, and a return path when you miss a portion.",
  },
  "ramadan-preparation-ch-3": {
    subtitle: "Let giving and dua become a daily Ramadan rhythm",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Ramadan opens the heart to giving and asking Allah. Charity should not be treated only as a last-minute donation, and dua should not be saved only for crisis. The source cards anchor dua as worship, hope, and reliance on Allah while taking responsible action. A Ramadan plan can make both practices concrete: choose causes before emotion or marketing pressure decides for you, set a small daily giving rhythm if able, keep a private dua list, and include the needs of family, the ummah, the oppressed, the sick, and your own guidance. Charity questions that involve zakat, debts, restricted funds, business money, or obligations need qualified advice. Voluntary giving should be sincere, lawful, and within real means.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which dua would you repeat every day if you believed Ramadan was a training ground for hope, not only a deadline for self-improvement?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make a Ramadan giving and dua sheet: three trusted causes, ten duas, and one small private act of service.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support dua, hope, and reliance. Zakat calculations, restricted donations, debts, and financial obligations should be checked with qualified guidance.",
      },
    ],
    reflectionQuestions: [
      "What dua belongs on your daily Ramadan list?",
      "What cause can you support responsibly without pressure or showing off?",
    ],
    actionSteps: [
      "Write ten duas before Ramadan begins.",
      "Choose trusted causes before donating.",
      "Schedule one small act of service that nobody needs to praise.",
    ],
    quiz: [
      {
        question: "How should charity and dua be planned for Ramadan?",
        options: [
          "With sincerity, reliable causes, and a private dua rhythm",
          "Only through impulsive pressure",
          "As public proof of spirituality",
        ],
        correctAnswer:
          "With sincerity, reliable causes, and a private dua rhythm",
        explanation:
          "Giving and dua should be sincere, realistic, and tied to worship rather than performance.",
      },
    ],
    audioScript:
      "Prepare your duas and your giving before the month arrives. Ask Allah with hope, and give with sincerity and care.",
  },
  "ramadan-preparation-ch-4": {
    subtitle: "Protect the last ten with a plan that does not collapse",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The last ten nights deserve preparation before they arrive tired. A user should not wait until the twenty-first night to decide how they will worship, sleep, work, care for family, and manage energy. The goal is not to create an impossible schedule that turns worship into resentment. The goal is a protected pattern: prayer, Quran, dua, repentance, charity, and less distraction. Some users can do long night worship. Others are parents, workers, carers, students, ill, pregnant, travelling, or exhausted. They still need a sincere plan according to capacity. Do not make exact claims about which night is Laylat al-Qadr; prepare all ten as much as you can, and ask Allah with hope.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What usually weakens your last ten: sleep debt, social plans, work, cooking, shopping, phone use, family tension, or trying to do too much at once?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a last-ten plan with three levels: full-energy night, workday night, and exhausted night. Include at least one dua, one prayer action, and one Quran contact for each level.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor fasting, patience, and prayer. Personal rulings around i'tikaf, menstruation, missed fasts, travel, and night worship details require qualified guidance.",
      },
    ],
    reflectionQuestions: [
      "What is your realistic worship plan for an exhausted night?",
      "What distraction should be reduced before the last ten begin?",
    ],
    actionSteps: [
      "Write three versions of a last-ten-night plan.",
      "Prepare a dua list before the twentieth night.",
      "Reduce one avoidable distraction for the final ten days.",
    ],
    quiz: [
      {
        question: "How should the last ten nights be approached?",
        options: [
          "With a sincere plan that fits capacity and protects all ten nights",
          "By guessing one night and ignoring the rest",
          "By making an impossible schedule and quitting",
        ],
        correctAnswer:
          "With a sincere plan that fits capacity and protects all ten nights",
        explanation:
          "A realistic plan helps the user worship consistently according to capacity and avoid despair after tired days.",
      },
    ],
    audioScript:
      "Prepare the last ten before they arrive. Build a plan for full energy, workday energy, and exhausted energy, and keep asking Allah with hope.",
  },
  "wudu-and-purification-ch-1": {
    subtitle: "Treat purification as preparation for meeting Allah",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Purification matters because salah is not entered casually. The Quran source on wudu places washing and wiping before prayer, and the prayer source reminds the user that salah is established for Allah's remembrance. A beginner should therefore see purification as both outward cleanliness and inward readiness. It is not meant to create panic, perfectionism, or endless checking. It is a merciful preparation: pause, clean what Allah commanded, and stand for prayer with intention. This book is sensitive because purification details differ by circumstance and sometimes by school of law. The chapter gives orientation only; users with menstruation, janabah, illness, wounds, incontinence, socks, tayammum, or persistent doubts need qualified teaching.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Notice whether purification currently feels calming, confusing, rushed, or stressful. The answer shows what kind of support you need next.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Before your next prayer, make wudu slowly enough to know what you are doing, then write down any question that needs a teacher rather than repeating from anxiety.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor purification in prayer preparation and remembrance. This is not a fatwa; detailed rulings and unusual cases require qualified scholarship.",
      },
    ],
    reflectionQuestions: [
      "What part of purification makes you most unsure?",
      "Where do you need calm instruction instead of repeated checking?",
    ],
    actionSteps: [
      "Make wudu once with calm attention before the next prayer.",
      "Write one purification question for a qualified teacher.",
      "Avoid repeating wudu from doubt unless you have learned that it is required.",
    ],
    quiz: [
      {
        question: "How should this chapter be used?",
        options: [
          "As orientation before learning detailed rulings from qualified teachers",
          "As a final fatwa for every purification case",
          "As a reason to panic about every doubt",
        ],
        correctAnswer:
          "As orientation before learning detailed rulings from qualified teachers",
        explanation:
          "Purification is worship, but details can be sensitive. Users need qualified guidance for personal cases.",
      },
    ],
    audioScript:
      "Purification prepares you for prayer. Learn it calmly, avoid panic, and ask qualified guidance when your case needs detail.",
  },
  "wudu-and-purification-ch-2": {
    subtitle: "Learn the Quran-anchored shape before advanced details",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The Quran source gives the core shape of wudu before prayer: wash the face, wash the arms to the elbows, wipe the head, and wash the feet to the ankles. Beginners should learn this shape from a reliable teacher who can also show order, intention, amount, repetition, and common madhhab-specific details. The goal is confidence, not improvisation. A simple learning session can do more than reading many conflicting online answers. Watch a trusted demonstration, practise once, and ask about the exact details your teacher follows. If you have bandages, skin conditions, limited mobility, water access issues, or medical concerns, do not guess. Ask qualified guidance about your circumstance.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which wudu step do you need demonstrated rather than only described: face, arms, head, feet, order, intention, or what breaks wudu?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Practise wudu with a trusted teacher, class, or reliable beginner demonstration. Mark one step to ask about before repeating uncertain habits.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards provide the Quran anchor and link purification to salah. Exact step details, nullifiers, wiping over socks, wounds, and exceptions need qualified instruction.",
      },
    ],
    reflectionQuestions: [
      "Which step do you need corrected by someone reliable?",
      "What online answer has made you more confused instead of clearer?",
    ],
    actionSteps: [
      "Watch or attend one reliable wudu demonstration.",
      "Practise the basic sequence once without rushing.",
      "Ask a teacher about one detail you keep guessing.",
    ],
    quiz: [
      {
        question: "What is the safest way to learn wudu as a beginner?",
        options: [
          "Learn the core shape from Quran and a qualified demonstration",
          "Collect random online opinions with no teacher",
          "Avoid prayer until every advanced detail is mastered",
        ],
        correctAnswer:
          "Learn the core shape from Quran and a qualified demonstration",
        explanation:
          "The Quran gives the anchor, and a qualified teacher helps beginners learn the applied details safely.",
      },
    ],
    audioScript:
      "Learn the basic shape of wudu, then let a reliable teacher correct the details. Confidence grows through calm instruction.",
  },
  "wudu-and-purification-ch-3": {
    subtitle: "Avoid rushing, dry spots, waste, and endless doubt",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Common purification mistakes often come from two opposite pressures: rushing so much that clear steps are missed, or doubting so much that worship becomes heavy. A beginner should slow down enough to wash properly, avoid wasting water, and learn what actually breaks wudu from qualified instruction. At the same time, they should not turn every uncertainty into a repeat cycle. Waswas, or persistent intrusive doubt, can make a person repeat wudu, prayer, or washing far beyond what teachers advise. The safer path is to learn the rule, act on knowledge, and ask for help when doubt becomes consuming. Purification should prepare prayer, not trap the user away from remembrance.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which pattern affects you more: rushing through steps, or repeating because of doubt? Each one needs a different correction.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one correction for the next wudu: slow down at the step you rush, or stop repeating a step after you have completed it with reasonable certainty.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect purification to prayer. Persistent doubts, compulsive washing, and personal rulings should be handled with qualified spiritual and, where needed, mental-health support.",
      },
    ],
    reflectionQuestions: [
      "Do you need more careful washing, or more protection from repeated doubt?",
      "What teacher or support could help you stop guessing?",
    ],
    actionSteps: [
      "Identify one rushed step or one repeated doubt cycle.",
      "Apply one correction during the next wudu.",
      "Ask a teacher if doubt is making purification hard to complete.",
    ],
    quiz: [
      {
        question: "What are two common purification problems?",
        options: [
          "Rushing steps and repeating from endless doubt",
          "Learning from qualified teachers",
          "Preparing calmly for prayer",
        ],
        correctAnswer: "Rushing steps and repeating from endless doubt",
        explanation:
          "Purification needs calm care without turning doubts into an exhausting repeat cycle.",
      },
    ],
    audioScript:
      "Slow down enough to wash properly, but do not let repeated doubt steal the prayer. Learn, act, and ask for help when unsure.",
  },
  "wudu-and-purification-ch-4": {
    subtitle: "Know which purification questions need qualified answers",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A beginner can learn the basic shape of wudu from reliable instruction, but many purification questions should not be guessed from a short app chapter. Ask a scholar or qualified teacher when the question involves menstruation, postnatal bleeding, janabah and ghusl, tayammum, wounds, casts, socks or footwear, chronic discharge, incontinence, illness, disability, missed prayers, travel, or repeated doubts that make worship difficult. Ask early rather than collecting anxiety. A good question includes your circumstance, what happened, what you already know, and what you need to do for the next prayer. The aim is not to outsource all thinking; it is to worship Allah with knowledge and calm.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Write the purification issue you have been carrying. Is it a basic learning question, a personal circumstance, a recurring medical issue, or a doubt pattern?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Prepare one concise question for a qualified teacher: the situation, the timing, what you did, and what ruling you need for the next prayer.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor the importance of purification and prayer. This chapter intentionally sends personal and sensitive cases to qualified scholarship before any publish-ready claim.",
      },
    ],
    reflectionQuestions: [
      "Which purification question should you stop trying to solve alone?",
      "What exact details would a teacher need to answer you responsibly?",
    ],
    actionSteps: [
      "Write one clear question for a qualified teacher.",
      "Include only the details needed for a responsible answer.",
      "Follow up with a trusted local scholar, teacher, or mosque class.",
    ],
    quiz: [
      {
        question: "Which issue should be taken to qualified guidance?",
        options: [
          "Menstruation, ghusl, wounds, chronic discharge, or repeated doubts",
          "A basic intention to learn calmly",
          "Wanting to prepare for prayer",
        ],
        correctAnswer:
          "Menstruation, ghusl, wounds, chronic discharge, or repeated doubts",
        explanation:
          "Sensitive purification cases need qualified answers because personal circumstances and school details can matter.",
      },
    ],
    audioScript:
      "Ask a qualified teacher when purification becomes personal, medical, recurring, or confusing. Knowledge brings calm to worship.",
  },
  "charity-and-sadaqah-ch-1": {
    subtitle: "Train generosity before comfort gives you permission",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Sadaqah begins before giving feels easy. The heart often waits for a perfect month: more savings, less pressure, no debt worries, no family needs, and no uncertainty. But generosity is a practice that can begin with a lawful, modest amount and a sincere intention. The Quran source on giving from good earnings reminds the user that giving should be connected to clean income and what is good, not leftovers used to quiet the conscience. This does not mean ignoring responsibilities or giving recklessly. A Muslim should give with gratitude, honesty, and balance: fulfil obligations, avoid showing off, choose trustworthy causes, and remember that wealth is tested by how it is earned, held, and released.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What usually delays your giving: fear, forgetfulness, mistrust, debt, lifestyle pressure, waiting for a big amount, or not knowing where to give?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one small sadaqah action that fits your real means. Before giving, check that the cause is trustworthy and that the intention is for Allah rather than image.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor giving in lawful wealth, zakat care, and seeking good in this life and the Hereafter. Personal zakat, debts, dependants, and restricted-fund questions need qualified guidance.",
      },
    ],
    reflectionQuestions: [
      "What fear or habit makes generosity feel delayed?",
      "How can you give from clean earnings without neglecting real responsibilities?",
    ],
    actionSteps: [
      "Choose one trustworthy cause.",
      "Give a modest amount that does not harm obligations.",
      "Write one sentence of intention before giving.",
    ],
    quiz: [
      {
        question: "What should shape voluntary giving?",
        options: [
          "Sincerity, lawful wealth, trustworthiness, and balance",
          "Pressure, showing off, and neglecting obligations",
          "Waiting forever until giving feels effortless",
        ],
        correctAnswer: "Sincerity, lawful wealth, trustworthiness, and balance",
        explanation:
          "Sadaqah should be sincere and responsible. Users still need qualified advice for zakat and complex money cases.",
      },
    ],
    audioScript:
      "Give before it feels easy, but do it with balance. Choose clean wealth, sincere intention, and a trustworthy cause.",
  },
  "charity-and-sadaqah-ch-2": {
    subtitle: "Make giving small enough to repeat and sincere enough to matter",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Small daily charity protects generosity from becoming only a Ramadan emotion or a crisis reaction. A user may not be able to give a large amount, but they may be able to give a small regular amount, share food, help a neighbour, support a family member lawfully, or remove a burden from someone. The point is not to turn worship into a public tracker. The point is to build a generous identity that remembers Allah in normal life. This chapter should also prevent financial confusion: voluntary sadaqah is not the same as zakat, and voluntary giving does not automatically replace obligations. Keep records where needed, especially if a payment might be intended as zakat, fidyah, kaffarah, or another specific duty.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which is easier for you: one emotional large donation, or a quiet repeated habit that nobody notices? What does that reveal about your intention?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Set a seven-day giving habit. It can be money, food, help, or service, but make it clear, lawful, and small enough to repeat.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support giving from good earnings and treating zakat topics carefully. If the giving is meant to fulfil a specific obligation, verify the ruling before counting it.",
      },
    ],
    reflectionQuestions: [
      "What small act of generosity can you repeat for seven days?",
      "When does tracking generosity help you stay sincere, and when does it feed image?",
    ],
    actionSteps: [
      "Choose one small daily charity habit for seven days.",
      "Keep it private unless sharing creates real benefit.",
      "Separate voluntary sadaqah records from zakat or other obligations.",
    ],
    quiz: [
      {
        question: "Why separate voluntary sadaqah from zakat records?",
        options: [
          "Because obligations need careful verification and intention",
          "Because voluntary charity has no value",
          "Because zakat can be guessed without guidance",
        ],
        correctAnswer:
          "Because obligations need careful verification and intention",
        explanation:
          "Voluntary giving is valuable, but zakat and other financial duties need clear intention and qualified care.",
      },
    ],
    audioScript:
      "Build generosity into ordinary days. Keep the habit small, sincere, and clear about whether it is voluntary or an obligation.",
  },
  "charity-and-sadaqah-ch-3": {
    subtitle:
      "Give service, skill, and presence when money is not the only need",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Charity is not only a payment screen. Service can be a serious form of generosity when it protects dignity and answers real needs. A user might give time to an elderly relative, help a new Muslim reach a class, cook for a family, volunteer with a verified charity, mentor a student, translate, drive someone to an appointment, or repair a community space. Service still needs adab. Do not use people's hardship for content. Do not enter spaces that require safeguarding, professional skill, or official permission without the right checks. Do not make promises you cannot keep. Good service is useful, reliable, and humble. It seeks good in this life and the Hereafter without treating people as projects.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What skill, access, time, or relationship has Allah given you that could reduce another person's burden without making them feel small?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one service act this week. Define who benefits, what you will do, when you will do it, and what boundary keeps it reliable.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect generosity with lawful good and akhirah-minded intention. Safeguarding, charity governance, and sensitive support work require proper local procedures.",
      },
    ],
    reflectionQuestions: [
      "What non-money resource can you give responsibly?",
      "What boundary would keep your service reliable instead of overpromised?",
    ],
    actionSteps: [
      "Pick one concrete service act for this week.",
      "Ask permission or follow the organisation's process where needed.",
      "Do the act without turning the recipient into content.",
    ],
    quiz: [
      {
        question: "What makes service-based charity responsible?",
        options: [
          "Usefulness, humility, reliability, and proper boundaries",
          "Posting vulnerable people for attention",
          "Promising more than you can actually do",
        ],
        correctAnswer:
          "Usefulness, humility, reliability, and proper boundaries",
        explanation:
          "Service is generous when it protects dignity and follows the right processes for the situation.",
      },
    ],
    audioScript:
      "Charity can be time, skill, care, and presence. Serve with humility, protect dignity, and keep your promises small enough to honour.",
  },
  "charity-and-sadaqah-ch-4": {
    subtitle: "Automate reminders without automating the heart",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Automatic giving can help a person stay consistent, but the heart should not become absent. A recurring donation, payroll giving, or monthly reminder can remove friction and stop good intentions from disappearing. Still, automation needs review: is the charity trustworthy, is the amount still responsible, is the payment lawful, and is the intention renewed? Users should also distinguish between recurring voluntary giving and obligations that require calculation or eligibility checks. Zakat categories are source-anchored and sensitive; a standing donation does not become valid zakat just because the recipient seems good. The practical path is to automate what is clearly voluntary and review anything obligation-linked with qualified guidance.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Would automation make your giving more consistent, or would it make you stop thinking about intention, trust, and responsibility?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create one giving reminder or recurring voluntary donation, then schedule a monthly review for intention, affordability, and charity trust.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards keep giving connected to lawful earnings and zakat care. Automated giving should not be treated as a replacement for verified zakat calculation or scholar-reviewed obligations.",
      },
    ],
    reflectionQuestions: [
      "What kind of giving can you safely automate as voluntary sadaqah?",
      "What financial duty needs review instead of autopilot?",
    ],
    actionSteps: [
      "Set one voluntary giving reminder or recurring donation.",
      "Add a monthly intention and affordability review.",
      "Keep zakat-linked payments separate until eligibility is verified.",
    ],
    quiz: [
      {
        question: "What is the safe use of automatic giving?",
        options: [
          "Automate clear voluntary giving and review obligations carefully",
          "Assume every recurring donation counts as zakat",
          "Never renew intention or check the charity",
        ],
        correctAnswer:
          "Automate clear voluntary giving and review obligations carefully",
        explanation:
          "Automation can support consistency, but zakat and restricted obligations need proper intention, eligibility, and review.",
      },
    ],
    audioScript:
      "Let automation remove friction, not intention. Review your giving, protect your obligations, and keep zakat questions clear.",
  },
  "zakat-with-confidence-ch-1": {
    subtitle: "See zakat as worship, purification, and a serious trust",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Zakat is not just a donation with a religious label. It is an obligation of worship connected to wealth, purification, and the rights Allah placed in money. The Quran source on giving from good earnings and the source listing zakat categories show why this topic needs care: the giver, wealth type, timing, recipient, and intention all matter. This chapter gives orientation, not a calculator or final ruling. A user should begin by taking zakat seriously, gathering their financial picture, and learning from qualified guidance before paying. Confidence comes from clear records, sincere intention, and knowing when to ask, not from guessing because the topic feels uncomfortable.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Do you treat zakat as worship requiring knowledge, or as a rushed annual payment you hope was close enough?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a zakat folder or note for this year: assets, debts, dates, questions, paid amounts, and which qualified source or scholar you will use.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor zakat in lawful wealth and recipient categories. This book is not a fatwa or calculator; qualified scholarship is required before publishing or relying on personal cases.",
      },
    ],
    reflectionQuestions: [
      "What part of zakat do you currently guess instead of learning?",
      "What records would make your next zakat question easier to answer?",
    ],
    actionSteps: [
      "Create one place to keep zakat records.",
      "Write down the qualified source or scholar you will consult.",
      "List the financial questions you need answered before paying.",
    ],
    quiz: [
      {
        question: "What kind of confidence should a user seek in zakat?",
        options: [
          "Confidence built on records, intention, and qualified guidance",
          "Confidence from guessing quickly",
          "Confidence from treating zakat as optional sadaqah",
        ],
        correctAnswer:
          "Confidence built on records, intention, and qualified guidance",
        explanation:
          "Zakat is an obligation, so confidence needs knowledge, records, and qualified review for personal cases.",
      },
    ],
    audioScript:
      "Zakat is worship and trust. Start with sincere intention, clear records, and qualified guidance rather than guessing.",
  },
  "zakat-with-confidence-ch-2": {
    subtitle: "Gather the financial picture before asking for a ruling",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Assets and debts are where many zakat questions become personal. Cash, savings, gold, business stock, investments, receivables, debts owed, loans, pensions, crypto, shared accounts, and family money may each raise different questions depending on the user's situation and scholarly approach. This chapter should not decide those cases. It teaches the user to gather information responsibly before asking. A vague question like 'how much zakat do I owe?' is hard to answer. A clear question includes what assets exist, who owns them, approximate values, dates, debts, business context, and what has already been paid. Better records lead to better guidance and less anxiety.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which part of your financial picture is unclear: ownership, amount, date, debt, business stock, investment type, or whether something is zakatable?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make a non-final zakat inventory. Do not calculate a ruling yet; just gather assets, debts, dates, ownership, and questions for qualified review.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support giving from good earnings and careful zakat handling. This chapter intentionally avoids issuing asset/debt rulings because those require qualified scholarship.",
      },
    ],
    reflectionQuestions: [
      "What asset or debt needs clarification before any calculation?",
      "Who owns each amount you are trying to include?",
    ],
    actionSteps: [
      "List assets with owner, approximate value, and date.",
      "List debts separately with enough detail for review.",
      "Turn unclear items into questions for a scholar or qualified zakat service.",
    ],
    quiz: [
      {
        question: "What should come before a personal zakat calculation?",
        options: [
          "A clear inventory and qualified review of unclear items",
          "Guessing from memory",
          "Ignoring debts, ownership, and asset type",
        ],
        correctAnswer:
          "A clear inventory and qualified review of unclear items",
        explanation:
          "Personal zakat depends on facts and rulings. The user should gather facts before seeking qualified guidance.",
      },
    ],
    audioScript:
      "Before calculating zakat, gather the picture: assets, debts, dates, ownership, and questions. Clarity comes before confidence.",
  },
  "zakat-with-confidence-ch-3": {
    subtitle: "Understand threshold and timing without guessing your case",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Nisab and hawl are key zakat concepts, but an app chapter should not pretend that every user's timing and threshold question is simple. Nisab relates to whether wealth has reached a qualifying threshold, and hawl relates to the passage of a zakat year for many wealth types. In real life, the questions can become more complex: fluctuating savings, salary deposits, business inventory, gold valuation, debts, shared accounts, investments, or missed years. The safest beginner step is to record a likely zakat date, learn the method from a qualified source, and ask about uncertainty before paying. Avoid live numeric values unless they come from a trusted, current zakat authority because gold and silver values change.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Do you know your zakat date, or have you been using Ramadan, tax season, or memory as a rough substitute?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write your current best-known zakat date, then mark every uncertainty beside it: threshold, timing, missed years, asset type, or valuation.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor zakat care and lawful giving. Threshold values, annual timing, missed zakat, and asset-specific cases must be checked with qualified, current guidance.",
      },
    ],
    reflectionQuestions: [
      "What is your best-known zakat date, and how sure are you?",
      "Which live value or timing question should not be guessed?",
    ],
    actionSteps: [
      "Write your best-known zakat date.",
      "List threshold and timing uncertainties.",
      "Use a current qualified zakat service or scholar before relying on a number.",
    ],
    quiz: [
      {
        question: "Why avoid fixed live nisab numbers in this chapter?",
        options: [
          "Because values change and personal cases need current qualified guidance",
          "Because zakat has no thresholds",
          "Because timing never matters",
        ],
        correctAnswer:
          "Because values change and personal cases need current qualified guidance",
        explanation:
          "Nisab values and personal timing questions require current information and qualified review.",
      },
    ],
    audioScript:
      "Learn nisab and hawl as concepts, then verify your own date and threshold with current qualified guidance.",
  },
  "zakat-with-confidence-ch-4": {
    subtitle: "Take complex money cases to qualified scholarship early",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Complex zakat cases should be taken to qualified scholarship before payment decisions are made. Ask when the case involves business stock, trade goods, rental property, pensions, shares, crypto, debts owed to or by you, inheritance, marriage assets, family-held money, mixed halal and questionable income, missed years, zakat paid to relatives, overseas distribution, or restricted charity funds. The Quran source on zakat categories shows that recipients also need care; good intentions alone do not prove eligibility. A strong question includes facts, dates, values, ownership, previous payments, and the school or scholar you normally follow. Asking early is part of worship. It protects both the giver and the people who have rights in the wealth.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which part of your zakat case would be risky to decide from a short app lesson: assets, recipients, timing, debts, business, relatives, or missed years?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Prepare a scholar-ready zakat question with facts only: who owns what, approximate values, dates, debts, intended recipients, and what decision you need.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor giving from good earnings and zakat recipient categories. This chapter is deliberately not publish-final without qualified scholar review and scope.",
      },
    ],
    reflectionQuestions: [
      "What recipient or asset question needs qualified review?",
      "What facts would make your question responsible rather than vague?",
    ],
    actionSteps: [
      "Write a scholar-ready zakat question.",
      "Separate facts from assumptions.",
      "Ask a qualified scholar or trusted zakat service before paying in complex cases.",
    ],
    quiz: [
      {
        question: "Which zakat cases should be escalated?",
        options: [
          "Business, investments, debts, relatives, missed years, or recipient eligibility",
          "Only simple reminders to gather records",
          "No cases, because every answer is obvious",
        ],
        correctAnswer:
          "Business, investments, debts, relatives, missed years, or recipient eligibility",
        explanation:
          "Complex wealth and recipient questions require qualified scholarship to protect the obligation.",
      },
    ],
    audioScript:
      "Take complex zakat questions early. Gather facts, separate assumptions, and ask qualified guidance before money moves.",
  },
  "quranic-arabic-starter-ch-1": {
    subtitle: "Learn how meaning grows from words, forms, and context",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Quranic Arabic is not a code where one memorised root unlocks every meaning by itself. It is a language with letters, sounds, roots, patterns, grammar, context, recitation, and revelation. A beginner should start with humility: learn the words you already meet in salah, notice repeated terms, and connect meaning to worship rather than collecting trivia. Many Quranic words are built from roots and patterns, but the exact meaning of an ayah also depends on sentence structure, usage, and tafsir. This chapter should make Arabic feel approachable without making the user overconfident. The aim is to hear Quran with more attention and to know when a dictionary or teacher is needed.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Think of one Arabic word you already know from prayer or Quran. Do you know only the sound, or also the broad meaning and where it appears?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose three Quranic words you already recite. Write the transliteration, a simple meaning from a reliable source, and one ayah or prayer moment where each appears.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards for this book are broad learning and worship anchors. Exact translation, grammar, tafsir, and legal extraction need reliable Arabic resources and qualified teachers.",
      },
    ],
    reflectionQuestions: [
      "Which familiar Quranic word do you say often but barely understand?",
      "What would help you stay humble while learning Arabic meaning?",
    ],
    actionSteps: [
      "Pick three familiar Quranic words.",
      "Record a simple meaning from a reliable source.",
      "Ask a teacher or trusted resource before using a word to explain an ayah publicly.",
    ],
    quiz: [
      {
        question: "What should a beginner remember about Quranic Arabic?",
        options: [
          "Roots help, but meaning also needs form, context, and tafsir",
          "One root always gives the full meaning alone",
          "Arabic study replaces qualified tafsir",
        ],
        correctAnswer:
          "Roots help, but meaning also needs form, context, and tafsir",
        explanation:
          "Arabic roots are useful, but Quran understanding needs grammar, context, reliable sources, and humility.",
      },
    ],
    audioScript:
      "Quranic Arabic opens meaning slowly. Learn familiar words, notice patterns, and keep tafsir and teacher guidance close.",
  },
  "quranic-arabic-starter-ch-2": {
    subtitle: "Start with the Arabic you already stand with in prayer",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The words of salah are the best starting point for many learners because they are already repeated every day. Takbir, praise, mercy, worship, help, guidance, bowing, prostration, testimony, salawat, and salam are not abstract vocabulary. They are words the heart meets while standing before Allah. A beginner should attach meaning to one prayer phrase at a time instead of trying to master every grammar point at once. The source cards connect prayer to remembrance and steady deeds, so Arabic learning should make salah more present, not only more technical. Pronunciation and required wording should be learned from reliable teachers, especially for new Muslims and children.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which prayer phrase do you say most automatically? What would change if you knew its meaning before the next salah?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make one salah word card: Arabic or transliteration, simple meaning, where it appears in prayer, and what it should wake in the heart.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor prayer as remembrance and regular worship. Exact pronunciation, required wording, and legal prayer details should be learned from qualified instruction.",
      },
    ],
    reflectionQuestions: [
      "Which salah phrase will you learn this week?",
      "How can Arabic meaning make your next prayer more present?",
    ],
    actionSteps: [
      "Choose one salah phrase.",
      "Learn its simple meaning from a reliable source.",
      "Recite it once in prayer with attention to the meaning.",
    ],
    quiz: [
      {
        question: "Why start Quranic Arabic with salah words?",
        options: [
          "They are repeated daily and can make prayer more present",
          "They remove the need to learn anything else",
          "They are only sounds with no meaning",
        ],
        correctAnswer:
          "They are repeated daily and can make prayer more present",
        explanation:
          "Prayer vocabulary is already part of daily worship, so learning its meaning can immediately deepen attention.",
      },
    ],
    audioScript:
      "Start with the words you already stand with in salah. One meaning learned well can change the next prayer.",
  },
  "quranic-arabic-starter-ch-3": {
    subtitle: "Use roots and patterns as clues, not shortcuts",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Roots and patterns are powerful because they show families of meaning. A learner may notice words connected to mercy, guidance, worship, knowledge, patience, or return, then start seeing those themes across the Quran. But roots are clues, not final explanations. A pattern can change the word's role, intensity, or relationship to the sentence. Some meanings need dictionaries, grammar, context, and tafsir before they are understood responsibly. The healthy beginner habit is to notice a possible connection, verify it, and record it humbly. This makes Quran study more alive without turning the learner into an instant interpreter.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where are you most tempted to overclaim: seeing one familiar root and assuming you know the whole ayah, or avoiding roots because they feel too advanced?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one Quranic root from a reliable learning resource. Write three related words, but add a note: verify context before explaining an ayah.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards encourage Quran contact and seeking knowledge. Root notes are learning aids, not standalone tafsir or legal proof.",
      },
    ],
    reflectionQuestions: [
      "What root family would help you notice Quranic themes more often?",
      "What verification step will stop you from overclaiming?",
    ],
    actionSteps: [
      "Pick one root from a reliable source.",
      "Record three related words and their simple meanings.",
      "Add one context warning beside the root note.",
    ],
    quiz: [
      {
        question: "How should roots and patterns be used?",
        options: [
          "As clues that must be verified with context and reliable sources",
          "As instant tafsir for every ayah",
          "As something beginners should never notice",
        ],
        correctAnswer:
          "As clues that must be verified with context and reliable sources",
        explanation:
          "Roots help learners see connections, but Quran meaning needs context, grammar, and reliable scholarship.",
      },
    ],
    audioScript:
      "Roots are clues, not shortcuts. Notice the pattern, verify the context, and let Arabic study make you more humble.",
  },
  "quranic-arabic-starter-ch-4": {
    subtitle: "Read with meaning while keeping recitation and tafsir distinct",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Reading with meaning means holding three layers with care: recitation, translation, and explanation. Recitation gives the Quran its lived sound and worship form. Translation gives a beginner access to broad meaning. Tafsir explains context, language, revelation, and scholarly understanding. Mixing these layers carelessly can confuse users. A translation is not the Quran itself, and a word note is not a tafsir conclusion. The beginner should read a small portion, listen to recitation, check a reliable translation, and write one honest reflection without pretending to issue an explanation for everyone. This protects love for the Quran and protects the user from careless speech about Allah's words.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "When you read Quran, do you know whether you are reciting, reading a translation, or studying tafsir? Which layer do you need next?",
      },
      {
        type: "action",
        heading: "Act",
        body: "For one short passage, complete a three-layer note: recite or listen, read a reliable translation, then write one question for tafsir study.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support regular Quran contact and knowledge-seeking. This chapter is an Arabic-learning guide, not a replacement for tafsir scholarship.",
      },
    ],
    reflectionQuestions: [
      "Which layer do you usually skip: recitation, translation, or tafsir?",
      "What question would make your next Quran reading more responsible?",
    ],
    actionSteps: [
      "Choose one short passage.",
      "Listen or recite, then read a reliable translation.",
      "Write one tafsir question instead of making a public claim.",
    ],
    quiz: [
      {
        question: "What should a learner keep distinct?",
        options: [
          "Recitation, translation, and tafsir",
          "Only personal opinion",
          "Translation and final legal rulings",
        ],
        correctAnswer: "Recitation, translation, and tafsir",
        explanation:
          "These layers work together, but they are not the same. Keeping them distinct protects responsible Quran learning.",
      },
    ],
    audioScript:
      "Read with meaning by respecting the layers: recitation, translation, and tafsir. Learn deeply, and speak carefully.",
  },
  "root-words-of-the-quran-ch-1": {
    subtitle: "Let roots reveal families of meaning without replacing context",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A root can reveal a family of meaning, but it does not deliver the full meaning of every word alone. Many Arabic words are connected through root letters, then shaped by patterns, grammar, and context. For Quran study, this helps the learner notice relationships: mercy appearing in different forms, guidance being requested and given, worship connected to servitude, or knowledge connected to recognition. But responsible root study must stay modest. A root note is a doorway to dictionaries, grammar, and tafsir, not a license to overrule translations or scholars. Use roots to become more attentive when reading Quran, not to become louder in interpretation.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What do you want roots to do for you: deepen attention, improve memory, support Arabic study, or make you feel certain before you have studied enough?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Open a root notebook with four columns: root, related words, ayah references, and verification notes from a reliable dictionary, teacher, or tafsir.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support Quran recitation and seeking knowledge. Root study needs reliable language tools and should not be used as standalone tafsir.",
      },
    ],
    reflectionQuestions: [
      "How can root study make you more attentive rather than more overconfident?",
      "What verification source will you use before trusting a root note?",
    ],
    actionSteps: [
      "Create a four-column root notebook.",
      "Add one root from a reliable Arabic learning source.",
      "Mark every unverified meaning as a question, not a conclusion.",
    ],
    quiz: [
      {
        question: "What does a root reveal most safely?",
        options: [
          "A family of meaning that still needs form and context",
          "A final tafsir conclusion by itself",
          "A way to ignore dictionaries and teachers",
        ],
        correctAnswer: "A family of meaning that still needs form and context",
        explanation:
          "Roots are powerful learning tools, but the exact meaning depends on form, grammar, context, and scholarship.",
      },
    ],
    audioScript:
      "A root opens a family of meaning. Let it sharpen attention, then verify the word through form, context, and reliable scholarship.",
  },
  "root-words-of-the-quran-ch-2": {
    subtitle: "Study mercy and guidance as themes before making claims",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Mercy and guidance are among the most important themes a learner notices in Quran study. Roots connected to mercy and guidance can help the reader see repeated calls to return, receive, ask, and walk rightly. But even beautiful themes need careful method. A word related to mercy in one context may emphasise compassion, kinship, care, or divine mercy depending on form and usage. A word related to guidance may describe showing the way, being guided, misguidance being avoided, or the straight path being requested. The learner should collect examples, read reliable translations, and check tafsir rather than flattening every occurrence into one English word.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "When you see repeated words around mercy or guidance, do you slow down enough to ask how this exact ayah is using the word?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one mercy or guidance word from a reliable resource. Record two ayah references and one note about how the context changes the meaning.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards encourage repeated Quran contact and knowledge-seeking. Theme notes must be checked against reliable translations and tafsir before teaching others.",
      },
    ],
    reflectionQuestions: [
      "Which theme do you want to track first: mercy or guidance?",
      "How can context stop you from flattening different ayat into one meaning?",
    ],
    actionSteps: [
      "Pick one mercy or guidance word from a reliable source.",
      "Record two ayah references.",
      "Write one context note for each reference.",
    ],
    quiz: [
      {
        question: "What should a learner avoid with theme roots?",
        options: [
          "Flattening every occurrence into one English meaning",
          "Checking translation and tafsir",
          "Recording ayah context",
        ],
        correctAnswer: "Flattening every occurrence into one English meaning",
        explanation:
          "Repeated roots reveal patterns, but each ayah needs its own context and reliable explanation.",
      },
    ],
    audioScript:
      "Mercy and guidance roots can open the Quran beautifully. Study the theme, then honour each ayah's context.",
  },
  "root-words-of-the-quran-ch-3": {
    subtitle: "Connect worship words to humility, not vocabulary pride",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Words connected to worship, obedience, servitude, prayer, bowing, prostration, remembrance, and submission should make the learner more humble. The risk of advanced vocabulary study is that the user starts collecting impressive terms while the heart becomes less responsive. A root connected to worship is not only something to define; it asks what the servant is doing with that knowledge. Does understanding a worship word improve salah, sincerity, obedience, repentance, or service? Does it make the user more careful when speaking about Allah's words? This chapter turns root study back into worship: learn the word, find it in Quran, check its meaning, then ask what it should change.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which worship word do you know technically but do not yet feel in salah or daily choices?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one worship-related word. Record its meaning, one Quran reference, and one action that would make the word visible in your life.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor Quran learning in regular recitation and seeking knowledge. Worship vocabulary should increase humility, not careless interpretation.",
      },
    ],
    reflectionQuestions: [
      "What worship word should become more alive in your next prayer?",
      "How can Arabic study make you more obedient rather than only more informed?",
    ],
    actionSteps: [
      "Pick one worship-related word.",
      "Find one Quran reference through a reliable source.",
      "Choose one practical action connected to the meaning.",
    ],
    quiz: [
      {
        question: "What should worship vocabulary produce?",
        options: [
          "More humility, sincerity, and careful action",
          "Vocabulary pride with no change",
          "Public claims without verification",
        ],
        correctAnswer: "More humility, sincerity, and careful action",
        explanation:
          "Learning worship words should serve worship itself, not ego or careless speech.",
      },
    ],
    audioScript:
      "Let worship words make you more humble. Learn the meaning, find the ayah, and ask what the word should change in you.",
  },
  "root-words-of-the-quran-ch-4": {
    subtitle: "Build a notebook that supports review, not overclaiming",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A root notebook is useful only if it is honest. It should not be a place where unverified guesses become permanent claims. Each entry should show what is known, what is uncertain, and where the meaning was checked. A strong entry includes the root, one or more related words, ayah references, a reliable translation note, a context note, and a question for teacher or tafsir review. The notebook should also support spaced review: revisit old roots, compare related words, and correct mistakes as knowledge grows. This makes Arabic learning cumulative and safe. The goal is not to publish impressive notes; it is to keep returning to Quran with more care.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Would your current notes let someone tell the difference between a verified meaning, a teacher note, and your own guess?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a root notebook template with labels for verified, needs review, and personal reflection. Use those labels before adding any new entry.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support structured Quran learning and seeking knowledge. A root notebook remains a learning tool until reviewed by reliable Arabic and tafsir sources.",
      },
    ],
    reflectionQuestions: [
      "How will your notebook show what is verified and what still needs review?",
      "What review rhythm will stop old mistakes from becoming habits?",
    ],
    actionSteps: [
      "Build a verified/needs-review/reflection note template.",
      "Add one root entry using the template.",
      "Schedule a weekly review to correct or strengthen old notes.",
    ],
    quiz: [
      {
        question: "What makes a root notebook safe?",
        options: [
          "Clear labels for verified notes, questions, and personal reflections",
          "Treating every guess as final",
          "Removing references and context",
        ],
        correctAnswer:
          "Clear labels for verified notes, questions, and personal reflections",
        explanation:
          "Good notes protect the learner from overclaiming and make review easier.",
      },
    ],
    audioScript:
      "Build your root notebook with honesty. Mark what is verified, what needs review, and what is only reflection.",
  },
  "khushu-in-salah-ch-1": {
    subtitle: "Give the heart a few moments to arrive before takbir",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Khushu often begins before the prayer technically begins. A rushed body usually brings a scattered mind with it: notifications, unfinished work, family noise, hunger, anxiety, or the last thing seen on the screen. Arriving before you begin means creating a small bridge between ordinary activity and standing before Allah. The source cards connect salah with remembrance and moral formation, so preparation should not be treated as decoration. It can be simple: make wudu with attention, silence the phone, face the qibla, take one breath, remember that Allah sees you, and begin. This does not guarantee perfect focus, but it gives the prayer a better doorway.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What most often enters salah with you: phone residue, urgency, tiredness, family stress, work pressure, or uncertainty about the prayer itself?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Before the next prayer, create a thirty-second arrival: phone away, body still, one breath, and one sentence of intention before takbir.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor prayer in remembrance, conduct, and small regular deeds. Exact fiqh details of prayer should still be learned from qualified instruction.",
      },
    ],
    reflectionQuestions: [
      "What one habit would help your heart arrive before salah?",
      "Which prayer in your day most needs a calmer transition?",
    ],
    actionSteps: [
      "Put the phone away before one prayer.",
      "Take one quiet breath before the first takbir.",
      "Write down what distracted you most after the prayer ends.",
    ],
    quiz: [
      {
        question: "What does arriving before salah help with?",
        options: [
          "Creating a calmer doorway into remembrance",
          "Guaranteeing perfect focus every time",
          "Replacing the need to learn prayer properly",
        ],
        correctAnswer: "Creating a calmer doorway into remembrance",
        explanation:
          "A short transition does not guarantee khushu, but it can reduce avoidable distraction and help the heart remember Allah.",
      },
    ],
    audioScript:
      "Before takbir, arrive. Put the phone away, still the body, breathe, and remember that you are about to stand before Allah.",
  },
  "khushu-in-salah-ch-2": {
    subtitle: "Let one phrase become alive instead of chasing everything",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Understanding what you say in salah is one of the most direct ways to invite presence. A beginner does not need to master every Arabic phrase before the next prayer. Start with one phrase: Allahu akbar, Al-Fatihah, subhana rabbiyal 'azim, subhana rabbiyal a'la, tashahhud, salawat, or one dua. Learn a simple meaning from a reliable source, then listen for that phrase during prayer. The goal is not to turn salah into a vocabulary exam. The goal is to let meaning meet worship. The source cards connect prayer to remembrance and steady deeds, so small regular meaning work can change the texture of prayer over time.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which phrase do you say often without feeling its meaning? Choose only one, so the next prayer has a clear focus.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make a one-phrase khushu card: phrase, simple meaning, where it appears in salah, and one heart response it should awaken.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support prayer as remembrance. Learn wording and pronunciation from qualified teachers where required, especially for new Muslims and children.",
      },
    ],
    reflectionQuestions: [
      "Which phrase in salah will you study first?",
      "What heart response should that phrase awaken?",
    ],
    actionSteps: [
      "Choose one prayer phrase.",
      "Learn its simple meaning from a reliable source.",
      "Listen for it in the next prayer without trying to change everything at once.",
    ],
    quiz: [
      {
        question: "What is a healthy first meaning goal in salah?",
        options: [
          "Learn one phrase well and bring it into prayer",
          "Turn the whole prayer into a language exam",
          "Avoid prayer until every phrase is mastered",
        ],
        correctAnswer: "Learn one phrase well and bring it into prayer",
        explanation:
          "Small regular meaning work can make prayer more present without overwhelming the user.",
      },
    ],
    audioScript:
      "Choose one phrase. Learn what it means, then meet it in salah. Khushu can grow through one living meaning at a time.",
  },
  "khushu-in-salah-ch-3": {
    subtitle: "Use the opening takbir to leave the world behind",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The first takbir is a threshold. When the servant says Allah is greater, the heart is being invited to lower the volume of everything else: status, deadlines, fear, appetite, anger, comparison, and the unfinished list waiting outside the prayer. Guarding the first takbir means not throwing it away while still mentally scrolling. It also means avoiding despair when distraction still comes. Khushu is trained through return. When the mind wanders, bring it back without turning the prayer into self-attack. The source card about small regular deeds matters here: repeated small returns can build a more present prayer over time.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What usually competes with the first takbir? Name it clearly so you can hand it back to Allah before starting.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Before the next opening takbir, name one worldly concern and say quietly to yourself: Allah is greater than this concern. Then begin.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect prayer to remembrance and steady growth. This chapter gives spiritual practice, not a technical fiqh ruling on prayer openings.",
      },
    ],
    reflectionQuestions: [
      "What thought follows you into the first takbir most often?",
      "How can you return gently when distraction appears?",
    ],
    actionSteps: [
      "Name one competing concern before takbir.",
      "Begin with the meaning of Allahu akbar in mind.",
      "When distracted, return once without self-attack.",
    ],
    quiz: [
      {
        question: "How should a user respond when distraction appears?",
        options: [
          "Return gently to the prayer without self-attack",
          "Assume the prayer is ruined immediately",
          "Follow the thought until the prayer ends",
        ],
        correctAnswer: "Return gently to the prayer without self-attack",
        explanation:
          "Khushu grows through repeated return. Distraction should be met with humble correction, not despair.",
      },
    ],
    audioScript:
      "The first takbir is a doorway. Allah is greater than the concern outside the prayer, so begin and keep returning.",
  },
  "khushu-in-salah-ch-4": {
    subtitle: "Review one lesson after prayer without judging the whole self",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "After-salah reflection should be brief, honest, and merciful. The aim is not to grade the whole soul after every prayer. The aim is to learn one thing: what helped, what distracted, what phrase felt alive, and what should be adjusted before the next prayer. Prayer is meant to shape conduct, so review should also ask whether salah is helping the tongue, habits, family treatment, and private choices. A user should avoid two extremes: never reviewing prayer at all, or becoming so harsh that salah feels like failure. The better path is a small note and a small next action. That is how remembrance becomes training.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "After your next prayer, ask one question only: what is one thing I can protect or improve before the next salah?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a three-word after-salah review: helped, distracted, next. Fill it in for one prayer today.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect prayer with remembrance, conduct, and small regular practice. Review should encourage steady return, not religious anxiety.",
      },
    ],
    reflectionQuestions: [
      "What helped your last prayer become more present?",
      "What one adjustment belongs before the next prayer?",
    ],
    actionSteps: [
      "Complete one helped/distracted/next review after salah.",
      "Choose one adjustment before the next prayer.",
      "Notice one character choice after prayer that salah should shape.",
    ],
    quiz: [
      {
        question: "What is the best after-salah review style?",
        options: [
          "Brief, honest, merciful, and action-focused",
          "Harsh judgement of the whole self",
          "No review ever",
        ],
        correctAnswer: "Brief, honest, merciful, and action-focused",
        explanation:
          "Reflection should help the next prayer and daily conduct, not turn worship into despair.",
      },
    ],
    audioScript:
      "After salah, review lightly: what helped, what distracted, what is next? Let the prayer teach you without crushing you.",
  },
  "sunnah-prayers-and-daily-extras-ch-1": {
    subtitle: "Add voluntary worship as love, not pressure",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Voluntary worship matters because love seeks extra nearness, but extras should never be used to neglect obligations or crush the heart. A user may want to add sunnah prayers, night prayer, duha, witr, extra Quran, dhikr, or service, but the first question is stability: are the obligatory prayers protected, and can this extra act be repeated without resentment? The source cards connect prayer to remembrance and small regular deeds. That makes sustainability part of the plan. Voluntary worship is not a competition with other people. It is a quiet doorway to Allah that should increase humility, gratitude, and steadiness.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which voluntary act attracts your heart, and which obligatory act still needs more protection?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one voluntary act for the next seven days, but only after naming how you will protect the obligatory prayer connected to it.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support remembrance, prayer, and small regular deeds. Exact sunnah prayer classifications and timings should be learned from qualified fiqh instruction.",
      },
    ],
    reflectionQuestions: [
      "What voluntary act would bring you closer to Allah without burning you out?",
      "What obligation should not be weakened by adding extras?",
    ],
    actionSteps: [
      "Choose one extra act for seven days.",
      "Protect the connected obligatory prayer first.",
      "Keep the extra private unless sharing helps accountability.",
    ],
    quiz: [
      {
        question: "How should voluntary worship be added?",
        options: [
          "Steadily, without neglecting obligations",
          "In a burst that causes burnout",
          "To compete with other people",
        ],
        correctAnswer: "Steadily, without neglecting obligations",
        explanation:
          "Extras are beautiful when they support nearness to Allah and do not damage obligatory worship or health.",
      },
    ],
    audioScript:
      "Add voluntary worship as love, not pressure. Protect the obligation, choose one extra, and keep it steady.",
  },
  "sunnah-prayers-and-daily-extras-ch-2": {
    subtitle: "Begin with a small prayer the week can actually hold",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Starting with two rak'at is a way to make growth concrete. The user does not need to redesign their whole worship life in one night. A small voluntary prayer can be attached to an existing moment: before or after a prayer where that is taught by reliable instruction, during a quiet morning window, or at night when energy allows. The key is to learn the timing and ruling from qualified guidance rather than guessing. Then keep the target small enough to protect. A single repeated act can teach more than an intense plan that disappears after two days. If tiredness, illness, childcare, travel, or work pressure is real, the plan should respect capacity.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where is the smallest realistic opening in your week for two rak'at without rushing the obligation or resenting the extra?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Pick one valid time for two voluntary rak'at after checking a reliable guide. Schedule it once this week, then review whether it should repeat.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards encourage prayer and steady deeds. Valid prayer times, disliked times, and school-specific details require qualified instruction.",
      },
    ],
    reflectionQuestions: [
      "What time of week could hold two extra rak'at calmly?",
      "What timing detail do you need to verify before starting?",
    ],
    actionSteps: [
      "Choose one valid voluntary prayer window from a reliable guide.",
      "Pray two rak'at once this week.",
      "Review whether the act felt sustainable.",
    ],
    quiz: [
      {
        question: "What should a user verify before adding voluntary rak'at?",
        options: [
          "Valid timing and relevant fiqh details from reliable guidance",
          "Only whether the mood feels right",
          "Nothing, because timing never matters",
        ],
        correctAnswer:
          "Valid timing and relevant fiqh details from reliable guidance",
        explanation:
          "Voluntary prayer is beautiful, but timing and details should be learned properly.",
      },
    ],
    audioScript:
      "Start with two rak'at that your week can hold. Verify the time, pray calmly, and build from steadiness.",
  },
  "sunnah-prayers-and-daily-extras-ch-3": {
    subtitle: "Treat Witr as a protected night anchor with learned details",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Witr is a beloved night anchor for many Muslims, but users should learn its status, timing, number of rak'at, and method according to reliable fiqh instruction. This chapter does not settle madhhab details. It helps the user protect a realistic night worship rhythm. For someone starting out, protecting Witr may mean setting a reminder before sleep, learning the method from a teacher, or pairing it with a short dua. For someone who already prays it, protection may mean reducing late-night scrolling or avoiding a schedule that makes the prayer rushed. The point is not to perform a dramatic night routine. It is to end the day with remembrance and humility.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What usually weakens night worship for you: sleep timing, phone use, uncertainty about method, exhaustion, or no reminder?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one Witr protection step: learn the method, set a bedtime reminder, reduce the last scroll, or ask a teacher one specific question.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support prayer and regular deeds. Witr method, timing, and legal status should be checked with qualified instruction in the user's school or learning path.",
      },
    ],
    reflectionQuestions: [
      "What detail about Witr do you need to learn properly?",
      "What habit before sleep makes night worship harder?",
    ],
    actionSteps: [
      "Write one Witr question for a teacher or reliable guide.",
      "Set one reminder before sleep.",
      "Reduce one late-night habit that pushes prayer away.",
    ],
    quiz: [
      {
        question: "How should Witr details be handled?",
        options: [
          "Learn method, timing, and status from reliable fiqh guidance",
          "Assume every detail is the same for everyone",
          "Avoid asking because details do not matter",
        ],
        correctAnswer:
          "Learn method, timing, and status from reliable fiqh guidance",
        explanation:
          "Witr is important, and its details should be learned carefully rather than guessed.",
      },
    ],
    audioScript:
      "Protect Witr as a night anchor. Learn the method, guard the timing, and let the day close with remembrance.",
  },
  "sunnah-prayers-and-daily-extras-ch-4": {
    subtitle: "Increase worship by protecting consistency and mercy",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Growing slowly is not weakness. It is often the path that lets worship survive real life. A user who adds too many extras at once may feel spiritual for a week and then collapse into guilt. A better method is one small act, one review point, and one adjustment after a week. Growth should respect obligations, health, family rights, work, sleep, and mental capacity. It should also leave room for tawbah after missed days. The source card about small regular deeds gives the user permission to value steady worship over dramatic spikes. Add worship in a way that makes the next act easier, not in a way that makes the heart run away from prayer.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where have you burned out before: too many goals, no rest, public pressure, guilt, or ignoring your real schedule?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Use a seven-day rule: keep one extra act for seven days before adding another. At the end, decide to keep, reduce, or change it.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support steady worship and prayer that shapes life. Growth plans are coaching, not rulings on every voluntary act.",
      },
    ],
    reflectionQuestions: [
      "What worship habit is small enough to protect for seven days?",
      "What sign would tell you to reduce rather than quit entirely?",
    ],
    actionSteps: [
      "Choose one extra act for seven days.",
      "Review it at the end of the week.",
      "Keep, reduce, or change the act instead of adding more automatically.",
    ],
    quiz: [
      {
        question: "What is the safest way to grow in voluntary worship?",
        options: [
          "Add one sustainable act, review it, then adjust",
          "Add many acts at once and ignore burnout",
          "Quit entirely after one missed day",
        ],
        correctAnswer: "Add one sustainable act, review it, then adjust",
        explanation:
          "Slow growth protects consistency and keeps worship connected to mercy rather than pressure.",
      },
    ],
    audioScript:
      "Grow slowly. Choose one extra act, keep it for seven days, and let mercy and consistency shape the next step.",
  },
  "ruh-focus-ch-2": {
    subtitle:
      "Hold purpose and choice together without pretending to solve qadr",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Purpose, qadr, and freedom must be handled with humility. A short discipline chapter should not pretend to settle the deep theology of divine decree. What it can do is help the user live responsibly inside what Allah has placed before them. You do not control the unseen, but you are still accountable for intention, effort, repentance, and the next halal choice. Qadr should not become an excuse for laziness, despair, or sin. Freedom should not become arrogance, as if outcomes belong to the self. Ruh Focus trains the middle posture: act with sincerity, accept what Allah decrees, return after mistakes, and ask qualified teachers when creed questions become heavy or confusing.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where are you using qadr to avoid responsibility, and where are you using self-reliance to forget Allah's control?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one matter you cannot control and one action you are responsible for today. Make dua before taking that action.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards as anchors for intention, time, and steady deeds. Detailed creed questions should be studied with qualified teachers.",
      },
    ],
    reflectionQuestions: [
      "What responsibility belongs to you today?",
      "What outcome must you leave with Allah after taking the means?",
    ],
    actionSteps: [
      "Write one responsible action and complete it today.",
      "Make dua before and after the action.",
      "Mark any unresolved creed question for qualified study.",
    ],
    quiz: [
      {
        question: "How should qadr be used in daily discipline?",
        options: [
          "As humility with responsible action",
          "As an excuse to avoid effort",
          "As proof that outcomes belong to the self",
        ],
        correctAnswer: "As humility with responsible action",
        explanation:
          "The believer acts sincerely while knowing outcomes and decree belong to Allah.",
      },
    ],
    audioScript:
      "Act with responsibility, leave outcomes with Allah, and do not turn qadr into laziness or self-reliance into pride.",
  },
  "ruh-focus-ch-3": {
    subtitle: "Treat time as a trust that reveals what the heart serves",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Time as amanah means the day is not only a container for tasks. It is a trust that reveals what the heart values. Surah Al-Asr anchors the urgency: time, faith, righteous action, truth, and patience are tied together. A disciplined Muslim does not need a perfect schedule, but does need honest stewardship. Where did the day go? What was protected? What was wasted? What rights were ignored? Time can be lost in obvious sin, but also in endless low-value motion that keeps the user busy while avoiding worship, family rights, health, study, and service. Ruh Focus turns time review into tawbah and planning, not self-hatred.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Look at yesterday without drama. Which hour served Allah, which hour served impulse, and which hour was simply unplanned?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one protected hour today for prayer, Quran, family duty, study, or honest work. Put a boundary around the main distraction.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards to keep time connected to faith, action, truth, patience, intention, and small regular deeds.",
      },
    ],
    reflectionQuestions: [
      "What part of your day most needs a boundary?",
      "Which trust did your time protect yesterday?",
    ],
    actionSteps: [
      "Protect one hour for a meaningful duty.",
      "Remove one avoidable distraction from that hour.",
      "Review tonight with tawbah and one adjustment.",
    ],
    quiz: [
      {
        question: "What does time as amanah require?",
        options: [
          "Honest stewardship, worship, duties, and review",
          "A perfect schedule with no mercy",
          "Being busy without purpose",
        ],
        correctAnswer: "Honest stewardship, worship, duties, and review",
        explanation:
          "Time is a trust. The goal is sincere stewardship, not perfectionism or empty busyness.",
      },
    ],
    audioScript:
      "Time is a trust. Protect one meaningful hour, then review it with tawbah, gratitude, and a better plan.",
  },
  "ruh-focus-ch-4": {
    subtitle: "Break shame cycles with tawbah, barriers, and real help",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Sin, shame, and addiction patterns need mercy and seriousness together. Shame can wake the heart, but toxic shame can also push a person to hide, repeat, and believe return is impossible. The Quran source on Allah's mercy protects the user from despair, while the source on responsibility prevents pretending the pattern is harmless. If the issue is compulsive, dangerous, sexual, financial, substance-related, self-harming, or harming others, this chapter is only a first step. The user may need a scholar, therapist, doctor, support group, accountability system, or safety plan. Ruh Focus should teach a loop: stop, return, remove access, repair harm, seek support, and build a cleaner replacement.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "After a slip, what happens first: tawbah, hiding, self-attack, more sin, or asking for help?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a recovery loop for one pattern: trigger, access point, support contact, replacement action, and repair step if harm happens.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards for hope, responsibility, and intention. Persistent addiction, danger, or harm needs qualified spiritual and professional support.",
      },
    ],
    reflectionQuestions: [
      "What trigger usually appears before the pattern?",
      "What support would make hiding harder and returning easier?",
    ],
    actionSteps: [
      "Remove or block one access point today.",
      "Save one trusted support contact.",
      "Make tawbah without delaying until emotions feel perfect.",
    ],
    quiz: [
      {
        question: "What should shame become after a slip?",
        options: [
          "A door to tawbah, repair, and support",
          "A reason to despair",
          "Proof that change is impossible",
        ],
        correctAnswer: "A door to tawbah, repair, and support",
        explanation:
          "Healthy remorse returns to Allah and takes action. Despair and secrecy can deepen the cycle.",
      },
    ],
    audioScript:
      "Do not let shame become distance. Return, remove the access point, repair what you can, and ask for real help.",
  },
  "ruh-focus-ch-5": {
    subtitle: "Build a small decision filter before pressure arrives",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Decision rules protect the heart before desire, fear, or social pressure starts negotiating. A modern Muslim faces choices quickly: what to watch, who to message, how to earn, when to speak, where to go, and what to ignore. Without a filter, the nafs often decides first and the heart explains later. Ruh Focus gives a simple filter: is it halal, is it sincere, does it protect prayer, does it honour people's rights, does it move me toward the person I ask Allah to make me? This is not a substitute for fatwa when details are complex. It is a first-line discipline tool for everyday choices that are already clear enough to act on.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which decision usually happens too fast for your taqwa to catch up: spending, scrolling, speech, desire, food, sleep, or work?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a five-question decision filter and use it once today before a choice you usually make on impulse.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards to connect decision-making to intention, time, patience, and steady deeds. Complex rulings still require qualified guidance.",
      },
    ],
    reflectionQuestions: [
      "What choice needs a rule before the moment of pressure?",
      "Which question in the filter would stop your most common mistake?",
    ],
    actionSteps: [
      "Write a five-question decision filter.",
      "Use it once before an impulse decision.",
      "Review whether it protected worship or character.",
    ],
    quiz: [
      {
        question: "What is the purpose of a decision rule?",
        options: [
          "To help the heart act before pressure takes over",
          "To replace scholars in complex rulings",
          "To justify impulses after the fact",
        ],
        correctAnswer: "To help the heart act before pressure takes over",
        explanation:
          "A decision rule gives the user a practical pause for everyday choices, while complex rulings still need scholarship.",
      },
    ],
    audioScript:
      "Build the rule before the pressure. Ask what is halal, sincere, protective of prayer, and honest toward people's rights.",
  },
  "ruh-focus-ch-6": {
    subtitle: "Let faith become a structure, not only a feeling",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Discipline through faith is not white-knuckled self-control. It is building a life where iman has structure: prayer times, Quran contact, halal work, guarded speech, better company, rest, exercise, and a return plan after slips. Feelings rise and fall; structure carries the believer through low-energy days. The hadith source about small regular deeds is a key anchor here. A user should choose habits small enough to repeat and meaningful enough to shape the heart. Discipline becomes harsh when it is cut off from mercy. It becomes weak when it has no boundaries. Faith-based discipline holds both: Allah is merciful, and the next action still matters.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where are you waiting for motivation when you actually need a smaller structure?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one faith structure for seven days: prayer alarm, Quran appointment, sleep boundary, speech pause, or a support check-in.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards to keep discipline tied to intention, time, and small regular deeds rather than harsh self-image.",
      },
    ],
    reflectionQuestions: [
      "What small structure would protect your iman this week?",
      "Where has harshness made discipline harder to sustain?",
    ],
    actionSteps: [
      "Choose one seven-day faith structure.",
      "Make it small enough to repeat.",
      "Review after seven days before adding more.",
    ],
    quiz: [
      {
        question: "What carries discipline through low-energy days?",
        options: [
          "Small faith structures repeated with mercy",
          "Only strong emotions",
          "Harshness without a plan",
        ],
        correctAnswer: "Small faith structures repeated with mercy",
        explanation:
          "Structure protects worship when motivation changes, especially when it remains connected to mercy and intention.",
      },
    ],
    audioScript:
      "Do not wait for motivation alone. Build a small faith structure and let it carry you through ordinary days.",
  },
  "ruh-focus-ch-7": {
    subtitle: "Let the pillars organise the week before extras multiply",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The five pillars are not only beliefs to list; they shape time, money, body, community, and direction. Ruh Focus treats them as habit anchors. Shahadah gives identity and intention. Salah structures the day. Zakat disciplines wealth. Fasting trains appetite and restraint. Hajj points the heart toward surrender and final return. A user should not add endless self-improvement tasks while neglecting these foundations. Some pillar details require qualified teaching, especially zakat, fasting exemptions, Hajj rites, purification, and prayer rulings. But the habit lesson is clear: build life around the pillars first, then let extras grow from a stable centre.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which pillar most needs practical support in your current week: prayer, wealth, fasting discipline, identity, or long-term spiritual direction?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one pillar anchor to protect this week. Make it specific: a prayer, a zakat question, a fasting habit, or a learning appointment.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards for time, intention, and steady practice. Pillar-specific rulings should be learned from qualified teachers.",
      },
    ],
    reflectionQuestions: [
      "Which pillar should organise your week more clearly?",
      "What exact support does that pillar need from you?",
    ],
    actionSteps: [
      "Choose one pillar anchor for the week.",
      "Write the exact action and time.",
      "Ask qualified guidance if the action involves detailed rulings.",
    ],
    quiz: [
      {
        question: "How should the pillars function in discipline?",
        options: [
          "As foundations that organise life before extras",
          "As ideas with no daily structure",
          "As replacements for learning details properly",
        ],
        correctAnswer: "As foundations that organise life before extras",
        explanation:
          "The pillars shape worship, time, wealth, body, and direction. Extras should grow from those foundations.",
      },
    ],
    audioScript:
      "Let the pillars organise your life first. Protect the foundation, then add extras from a stable centre.",
  },
  "ruh-focus-ch-8": {
    subtitle: "Train mind, body, and spirit without worshipping performance",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A warrior routine is not a brand image or a harsh personality. For a Muslim, strength should serve worship, family rights, lawful work, courage, and service. Mind, body, and spirit need care together: sleep, movement, food, prayer, Quran, focused work, guarded speech, and time away from addictive inputs. The danger is turning discipline into ego: aesthetic routines, public proof, contempt for weaker people, or ignoring illness and responsibility. Ruh Focus reframes strength as amanah. Train because Allah gave you a body and life to use well. Rest because the body has rights. Seek help when health, injury, depression, or addiction makes private effort unsafe or insufficient.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Does your discipline routine make you more useful and humble, or more image-focused and hard toward others?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Build a one-day warrior routine with four anchors: prayer, movement, focused work, and one act of service or family care.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards for intention, time, and steady deeds. Health, injury, and mental-health cases need appropriate professional support.",
      },
    ],
    reflectionQuestions: [
      "What part of your routine serves ego more than worship?",
      "What body or health right have you neglected?",
    ],
    actionSteps: [
      "Plan one day with prayer, movement, work, and service.",
      "Remove one performance-driven habit.",
      "Rest or seek help where the body or mind has a real need.",
    ],
    quiz: [
      {
        question: "What should strength serve?",
        options: [
          "Worship, rights, service, and humility",
          "Image and contempt for others",
          "Ignoring health and family duties",
        ],
        correctAnswer: "Worship, rights, service, and humility",
        explanation:
          "A Muslim routine should make the user more obedient, reliable, and useful, not merely impressive.",
      },
    ],
    audioScript:
      "Train strength as amanah. Pray, move, work, serve, and keep performance from becoming the new idol.",
  },
  "ruh-focus-ch-9": {
    subtitle: "Earn and spend as someone who will meet Allah",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Wealth, work, and worship meet every day. A job can become worship through halal effort, sincerity, excellence, honesty, and service. It can also become a trap when income, status, speed, or fear makes the user compromise prayer, family rights, lawful boundaries, or zakat responsibilities. The source cards on giving from good earnings and zakat categories make this topic high-care. Ruh Focus should not issue financial rulings. It should train the user to ask better questions: how is this earned, who is harmed, what rights are owed, what must be purified, and where do I need qualified guidance? The modern Muslim needs ambition with accountability.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where does work currently strengthen your worship, and where does it quietly compete with it?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a wealth review with three lines: one halal earning check, one right owed to others, and one question for qualified guidance.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards for lawful giving, zakat care, and seeking good in both worlds. Zakat, contracts, doubtful income, and business cases need qualified scholarship.",
      },
    ],
    reflectionQuestions: [
      "What right does your money or work create for someone else?",
      "Which financial question should not be guessed privately?",
    ],
    actionSteps: [
      "Write one halal earning check.",
      "Identify one owed right or giving duty.",
      "Prepare one qualified question about wealth if needed.",
    ],
    quiz: [
      {
        question: "How should a Muslim treat work and wealth?",
        options: [
          "As ambition under accountability to Allah",
          "As status without boundaries",
          "As separate from worship",
        ],
        correctAnswer: "As ambition under accountability to Allah",
        explanation:
          "Work can be worship when it is lawful, sincere, excellent, and accountable.",
      },
    ],
    audioScript:
      "Earn and spend as someone who will meet Allah. Let ambition serve worship, not replace it.",
  },
  "ruh-focus-ch-10": {
    subtitle: "Build brotherhood with warmth and clean boundaries",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Brotherhood and sisterhood are not only friendliness. They require safety from the tongue and hand, protection from suspicion and backbiting, and enough boundaries to keep love from becoming control. Some users need to become more open, generous, and connected. Others need to stop over-sharing, rescuing, gossiping, or accepting harm in the name of loyalty. The source cards on speech, harm, and the Messenger's example give the direction: be safe for people, but do not hide abuse or rights violations under fake niceness. Healthy brotherhood helps worship and character. It does not demand access to every private detail or excuse repeated harm.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which relationship needs more warmth, and which relationship needs a clearer boundary?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one brotherhood action: check on someone sincerely, stop one piece of gossip, apologise, or set one clean boundary.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards to guard speech and harm. Abuse, safety, and serious rights issues need appropriate help, not silence.",
      },
    ],
    reflectionQuestions: [
      "Who feels safe from your tongue and hand?",
      "Where does loyalty need a boundary to remain healthy?",
    ],
    actionSteps: [
      "Check on one person without seeking credit.",
      "Refuse one gossip opportunity.",
      "Set or respect one clean boundary.",
    ],
    quiz: [
      {
        question: "What does healthy brotherhood require?",
        options: [
          "Warmth, safety, guarded speech, and boundaries",
          "Gossip disguised as concern",
          "Accepting harm without help",
        ],
        correctAnswer: "Warmth, safety, guarded speech, and boundaries",
        explanation:
          "Real brotherhood protects honour and safety while staying connected through mercy.",
      },
    ],
    audioScript:
      "Build connection with clean speech and clean boundaries. Be safe for people, and do not hide harm under loyalty.",
  },
  "ruh-focus-ch-11": {
    subtitle: "Stay Muslim in the pressure of ordinary real life",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Real world survival is the discipline of staying Muslim when life is not quiet, aesthetic, or easy. The user may be handling work deadlines, family pressure, bills, fatigue, loneliness, school, social media, or a private habit nobody sees. Ruh Focus should not romanticise hardship or pretend that pressure disappears through motivation. It gives a survival frame: protect the next prayer, tell the truth, keep one halal boundary, ask for help early, and return after slips. Surah Al-Asr keeps the priorities sharp: faith, righteous action, truth, and patience. Survival is not the final goal, but it is a mercy when the heart is trying not to drown.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What pressure currently makes your Islam feel hardest to practise: money, family, desire, tiredness, loneliness, work, school, or image?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose a survival anchor for today: protect one prayer, tell one truth, keep one boundary, or ask one person for help.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards for time, intention, patience, and steady deeds. Serious safety, mental health, family, or financial crises need real support.",
      },
    ],
    reflectionQuestions: [
      "What is the next prayer, truth, or boundary you need to protect?",
      "Where do you need help instead of private endurance?",
    ],
    actionSteps: [
      "Pick one survival anchor for today.",
      "Make it visible on your phone or notebook.",
      "Review tonight without exaggerating success or failure.",
    ],
    quiz: [
      {
        question: "What is a real-world survival anchor?",
        options: [
          "One clear act that protects faith under pressure",
          "Pretending pressure is not real",
          "Waiting for life to become easy before practising",
        ],
        correctAnswer: "One clear act that protects faith under pressure",
        explanation:
          "A survival anchor keeps the user connected to worship and character during difficult ordinary life.",
      },
    ],
    audioScript:
      "Real life will not always be quiet. Protect one prayer, one truth, one boundary, and keep returning.",
  },
  "ruh-focus-ch-12": {
    subtitle: "Lead with mercy, rights, and restraint in family love",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Marriage, love, and leadership are sensitive because real people can be helped or harmed by careless advice. Ruh Focus should speak in principles, not private verdicts. The Quran source on tranquillity, affection, and mercy gives the aspiration; the source on living with kindness and restraint protects against harshness. Leadership in a Muslim home is not ego, control, intimidation, or image. It is responsibility before Allah: prayer, provision where owed, gentleness, consultation, protection, repair, and knowing when help is needed. If there is abuse, coercion, legal conflict, divorce, intimacy harm, or safety risk, the user needs qualified local support, not a motivational chapter.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Does your closest relationship feel more like mercy and safety, or more like control, fear, neglect, or performance?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one family leadership action: apologise sincerely, listen without interrupting, fulfil one duty, or seek qualified help for a serious issue.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards as family and marriage anchors. Personal marriage, divorce, abuse, and rights questions require qualified scholarship and appropriate local help.",
      },
    ],
    reflectionQuestions: [
      "What responsibility in your family needs more mercy?",
      "Where does this situation need qualified help rather than private advice?",
    ],
    actionSteps: [
      "Perform one family duty with sincerity.",
      "Repair one avoidable harm if safe and appropriate.",
      "Seek real help if there is abuse, coercion, or serious conflict.",
    ],
    quiz: [
      {
        question: "What should family leadership mean here?",
        options: [
          "Responsibility, mercy, rights, and restraint before Allah",
          "Control and intimidation",
          "Avoiding help when harm is serious",
        ],
        correctAnswer:
          "Responsibility, mercy, rights, and restraint before Allah",
        explanation:
          "Marriage and family guidance must protect mercy, rights, safety, and qualified support where needed.",
      },
    ],
    audioScript:
      "Lead with mercy, not ego. Family love has rights, responsibilities, repair, and sometimes a need for real help.",
  },
  "ruh-focus-ch-13": {
    subtitle: "Build strength that can carry pain without denying it",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Patience, pain, and mental strength are often spoken about too cheaply. A believer should not be told to pretend pain is small, hide serious distress, or treat seeking help as weak faith. The source cards on patience, responsibility, and hope give a fuller picture: seek help through patience and prayer, remember that Allah knows capacity, and do not despair of Allah's mercy. Mental strength means naming the pain, protecting worship in possible ways, taking lawful means, asking for support, and refusing to let hardship erase hope. If the user is unsafe, self-harming, abused, or unable to function, they need urgent local or professional support alongside dua and worship.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What pain are you minimising, and what pain are you letting define the whole future?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a support map: one act of worship, one practical step, one person to contact, and one emergency route if the situation becomes unsafe.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards for patience, prayer, capacity, and hope. This is not medical or crisis advice; urgent danger needs immediate local help.",
      },
    ],
    reflectionQuestions: [
      "What support would make this pain less isolating?",
      "What is one possible act of worship in your current capacity?",
    ],
    actionSteps: [
      "Write a four-part support map.",
      "Take one lawful practical step today.",
      "Use emergency or crisis support if there is danger.",
    ],
    quiz: [
      {
        question: "What is mental strength in this chapter?",
        options: [
          "Hope, worship, lawful means, and support without denial",
          "Pretending pain is not real",
          "Never asking for help",
        ],
        correctAnswer:
          "Hope, worship, lawful means, and support without denial",
        explanation:
          "Islamic patience does not require denial or unsafe isolation. Help and worship can work together.",
      },
    ],
    audioScript:
      "Do not deny pain, and do not let pain erase hope. Seek Allah's help and take the support Allah made available.",
  },
  "ruh-focus-ch-14": {
    subtitle: "Fight recurring sin with a plan, not self-hatred",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Fighting sin and spiritual addiction needs more than emotional promises. The user needs tawbah, but also a pattern map: trigger, place, time, device, emotion, person, access point, and aftermath. The Quran source on mercy prevents despair; the source on capacity prevents impossible plans. A recurring sin often survives because the environment remains unchanged. The first fight is not dramatic. It may be blocking an app, leaving a room, changing sleep, giving someone accountability, removing payment access, or seeking specialist help. Ruh Focus should never tell users to hide dangerous behaviour. If harm is serious, compulsive, illegal, abusive, or unsafe, qualified support is part of the plan.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What pattern appears before the sin: boredom, anger, loneliness, tiredness, secrecy, money, access, or a specific app?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Build a sin-fighting map with one trigger, one blocked access point, one replacement action, and one support person or route.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards for hope, capacity, and intention. Serious addiction, harm, or safety risk needs qualified spiritual and professional help.",
      },
    ],
    reflectionQuestions: [
      "What access point must be blocked before the next test?",
      "Who could help you stop hiding?",
    ],
    actionSteps: [
      "Map one recurring pattern.",
      "Block one access point today.",
      "Ask for support if the pattern is compulsive or harmful.",
    ],
    quiz: [
      {
        question: "What does recurring sin usually need after tawbah?",
        options: [
          "A pattern map, barriers, replacements, and support",
          "Only vague guilt",
          "Keeping the same environment unchanged",
        ],
        correctAnswer: "A pattern map, barriers, replacements, and support",
        explanation:
          "Tawbah should be followed by practical barriers and help when the pattern is serious.",
      },
    ],
    audioScript:
      "Do not fight recurring sin with self-hatred alone. Map the pattern, close the door, replace the habit, and seek support.",
  },
  "ruh-focus-ch-15": {
    subtitle: "Protect the Muslim mind from noise, envy, and endless input",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The modern world competes for the Muslim mind through speed, comparison, outrage, desire, entertainment, and constant input. The problem is not that every tool is haram or every platform is useless. The problem is that an unguarded mind becomes easy to steer. Ruh Focus trains selective attention: what enters the eyes, ears, and heart? What makes worship feel heavy? What makes envy, anger, lust, or despair louder? A Muslim mind needs Quran, prayer, good company, useful knowledge, and quiet enough to think. The solution is not disappearing from the world. It is using the world without letting it become the owner of the heart.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which input most changes your mood or worship: news, reels, chats, comparison, explicit content, arguments, or endless productivity content?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one input fast for 24 hours and replace it with Quran, dhikr, useful study, a walk, or a family duty.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards for time, intention, and regular deeds. If a digital habit is compulsive or harmful, include real support and stronger barriers.",
      },
    ],
    reflectionQuestions: [
      "What input most weakens your heart?",
      "What good input should replace it, not merely leave an empty space?",
    ],
    actionSteps: [
      "Fast from one harmful input for 24 hours.",
      "Choose a replacement before the urge appears.",
      "Review whether worship felt lighter or clearer.",
    ],
    quiz: [
      {
        question: "What is the aim of guarding the Muslim mind?",
        options: [
          "Use the world without letting it own the heart",
          "Consume every input without filters",
          "Disappear from all responsibility",
        ],
        correctAnswer: "Use the world without letting it own the heart",
        explanation:
          "The goal is disciplined attention that protects worship, character, and useful engagement.",
      },
    ],
    audioScript:
      "Guard what enters the mind. Reduce the noise, replace it with what nourishes, and do not let the world own the heart.",
  },
  "ruh-focus-ch-16": {
    subtitle: "Turn ambition into a mission that survives accountability",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Vision and mission are not only business words. A Muslim needs direction that can stand before Allah. Ambition can be a trust when it serves worship, family rights, excellence, service, halal provision, and benefit to people. It becomes dangerous when it feeds status, neglects obligations, or makes the akhirah feel distant. The source cards on time, intention, and life as a test help the user ask better questions: what am I building, who benefits, what rights are protected, and what will remain after death? Ruh Focus should make ambition cleaner, not smaller. The mission is to become useful without becoming owned by success.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "If your current ambition succeeded, would it make you more obedient, more useful, and more accountable, or only more seen?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a mission sentence with three tests: worship protected, people benefited, and akhirah remembered.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards for intention, time, and excellent action. Career, wealth, and family trade-offs may need trusted counsel.",
      },
    ],
    reflectionQuestions: [
      "What is your ambition serving right now?",
      "What right must your mission never trample?",
    ],
    actionSteps: [
      "Write one mission sentence.",
      "Add worship, benefit, and accountability tests.",
      "Remove one status-driven goal that weakens sincerity.",
    ],
    quiz: [
      {
        question: "What should Muslim ambition become?",
        options: [
          "A mission under worship, benefit, and accountability",
          "Status without limits",
          "Avoiding effort completely",
        ],
        correctAnswer: "A mission under worship, benefit, and accountability",
        explanation:
          "Ambition is safest when it serves Allah, benefits people, and remembers the akhirah.",
      },
    ],
    audioScript:
      "Clean your ambition. Build something useful, protect worship and rights, and keep the akhirah in the mission.",
  },
  "ruh-focus-ch-17": {
    subtitle: "Balance learning and courage without arrogance",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The scholar and the soldier within are two needed strengths: learning and courage. Knowledge without courage may stay in notebooks while duties are neglected. Courage without knowledge can become reckless, harsh, or loud. A modern Muslim needs both: study enough to act responsibly, then act with humility. This chapter should stop the user from pretending every hesitation is wisdom or every impulse is bravery. The source cards on seeking knowledge, intention, and excellent action point to a balanced path. Ask, learn, verify, then move. When the matter involves fatwa, family rights, mental health, wealth, or safety, courage may mean pausing and getting qualified help.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where are you over-studying to avoid action, and where are you acting too fast without knowledge?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one matter and label the next step: learn, ask, act, apologise, or wait for qualified guidance.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards for knowledge, intention, and excellent action. Balance courage with verified guidance.",
      },
    ],
    reflectionQuestions: [
      "What action has enough knowledge behind it now?",
      "What decision needs more qualified learning before movement?",
    ],
    actionSteps: [
      "Pick one pending matter.",
      "Choose learn, ask, act, apologise, or wait.",
      "Complete that next step within 24 hours if safe.",
    ],
    quiz: [
      {
        question: "What is the balance of scholar and soldier?",
        options: [
          "Learn responsibly and act with humility",
          "Study forever without action",
          "Act loudly without knowledge",
        ],
        correctAnswer: "Learn responsibly and act with humility",
        explanation:
          "The user needs both guidance and courage, with humility and qualified support for complex matters.",
      },
    ],
    audioScript:
      "Learn enough to act, and act humbly enough to keep learning. Courage and knowledge need each other.",
  },
  "ruh-focus-ch-18": {
    subtitle: "Walk through dunya with the akhirah still visible",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Walking among people while thinking of Jannah means living fully in the world without forgetting where the road ends. The user still works, studies, marries, raises children, builds, rests, and enjoys halal blessings. But the heart keeps a second horizon: death, meeting Allah, accountability, and the hope of Jannah. The source card on every soul tasting death is not meant to make life bleak. It is meant to restore proportion. An insult, promotion, purchase, temptation, or delay looks different when the akhirah is visible. Ruh Focus trains the user to ask: will this matter when I stand before Allah, and what action would make it matter in a good way?",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which current worry would shrink if the akhirah were more visible, and which current duty would become more important?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Before one decision today, ask: how will this look when I meet Allah? Then choose one action with the akhirah in view.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards on death, accountability, and excellent action to keep worldly life in proportion without abandoning responsibility.",
      },
    ],
    reflectionQuestions: [
      "What worry needs akhirah perspective?",
      "What duty becomes heavier when you remember meeting Allah?",
    ],
    actionSteps: [
      "Ask the meeting-Allah question before one choice.",
      "Do one hidden good deed for the akhirah.",
      "Reduce one action that only feeds image.",
    ],
    quiz: [
      {
        question: "What does akhirah perspective do?",
        options: [
          "Restores proportion while keeping responsibility",
          "Makes all worldly duties meaningless",
          "Turns worship into sadness only",
        ],
        correctAnswer: "Restores proportion while keeping responsibility",
        explanation:
          "Remembering the akhirah should clarify priorities, not erase lawful responsibilities.",
      },
    ],
    audioScript:
      "Walk through dunya with Jannah still visible. Let the final meeting give today's choices their true weight.",
  },
  "ruh-focus-ch-19": {
    subtitle: "Become useful without needing to be seen as special",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Becoming a light for others is not becoming the centre of attention. It is becoming someone whose presence makes obedience easier, whose speech is safer, whose service is sincere, and whose private worship protects public usefulness. The danger is wanting to be known as inspiring more than wanting to be useful. Ruh Focus should turn the user toward quiet benefit: teach what you know responsibly, serve without humiliating people, give without showing off, encourage without pretending to be above struggle, and keep returning to Allah. Light is not performance. It is guidance reflected through character, mercy, truth, patience, and consistency.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Do you want to help people, or do you want people to see you as the kind of person who helps?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one quiet benefit today: teach a small verified lesson, serve someone, repair harm, give privately, or encourage one person sincerely.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards for truth, patience, intention, and the prophetic example. Do not teach beyond verified knowledge.",
      },
    ],
    reflectionQuestions: [
      "Where does your desire to be seen compete with sincere service?",
      "What quiet benefit can you offer without needing credit?",
    ],
    actionSteps: [
      "Do one private or low-visibility act of benefit.",
      "Avoid posting it unless there is a real benefit.",
      "Make dua for sincerity after the action.",
    ],
    quiz: [
      {
        question: "What does it mean to be a light for others?",
        options: [
          "To be useful with sincerity, truth, mercy, and humility",
          "To chase attention",
          "To teach beyond verified knowledge",
        ],
        correctAnswer:
          "To be useful with sincerity, truth, mercy, and humility",
        explanation:
          "Benefit is strongest when it is sincere, verified, and grounded in good character.",
      },
    ],
    audioScript:
      "Be useful without needing to be seen as special. Let sincerity make the light cleaner.",
  },
  "ruh-focus-ch-20": {
    subtitle: "End the path with sujud, repentance, and a clean return",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The final sujud brings Ruh Focus back to the simplest truth: the servant returns to Allah. Discipline, ambition, brotherhood, family, wealth, pain, and purpose all end in need. Sujud lowers the body and exposes the heart's dependence. The chapter should not make a grand claim that one moment fixes every problem. It should invite a clean return: repent, ask, thank, surrender, and rise with one better action. The sources on death and life as a test remind the user that the ending is real. A life of focus is not a life with no slips. It is a life that keeps returning until the final return.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "If tonight were your last review, what would you want to repent from, thank Allah for, and repair before meeting Him?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make one private sujud or dua moment. Ask for forgiveness, name one gratitude, and choose one repair action before the day ends.",
      },
      {
        type: "source",
        heading: "Review",
        body: "Use the source cards on death, accountability, intention, and excellent action. Personal rulings and serious harms still need qualified help and repair.",
      },
    ],
    reflectionQuestions: [
      "What needs tawbah before another day passes?",
      "What one repair action would make your return to Allah cleaner?",
    ],
    actionSteps: [
      "Make one private dua or sujud moment.",
      "Name one gratitude and one repentance.",
      "Complete one small repair action today.",
    ],
    quiz: [
      {
        question: "What is the final lesson of Ruh Focus?",
        options: [
          "Keep returning to Allah with repentance and action",
          "Never admit weakness",
          "Assume discipline removes the need for mercy",
        ],
        correctAnswer: "Keep returning to Allah with repentance and action",
        explanation:
          "The path ends in dependence on Allah: tawbah, gratitude, repair, and the final return.",
      },
    ],
    audioScript:
      "End in sujud. Repent, thank Allah, repair what you can, and keep returning until the final return.",
  },
  "hajj-and-umrah-preparation-ch-1": {
    subtitle: "Set the journey on intention before logistics take over",
    estimatedMinutes: 7,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A Hajj or Umrah journey begins before flights, hotels, bags, or checklists. It begins with why the heart wants to travel: obedience to Allah, repentance, gratitude, and a desire to return cleaner than it left. This chapter helps the user separate sacred intention from social pressure, tourism, status, content creation, or rushing through rites without presence. The source anchor reminds pilgrims that sacred travel trains taqwa and restraint, so preparation should include manners, patience, money clarity, family responsibilities, and enough learning to avoid confusion. This is not a legal verdict on ihram or rites; it is a readiness layer that points the user toward qualified guidance before departure.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Write the sentence you would want to be true when you stand before Allah on this journey. Then notice what might compete with it: comfort, photos, arguments, shopping, comparison, fatigue, or wanting everything to go exactly to plan.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a private travel intention note. Add three non-negotiables: one worship goal, one adab goal, and one people goal, such as patience with family or gentleness with strangers.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the verified Quran source cards below as anchors for restraint, patience, and taqwa. Exact rulings for ihram, miqat, menstruation, illness, missed rites, or penalties must be checked with qualified scholarship.",
      },
    ],
    reflectionQuestions: [
      "What intention do you want to protect when travel becomes tiring?",
      "Which distraction is most likely to weaken your adab during the journey?",
    ],
    actionSteps: [
      "Write a one-sentence intention for the journey.",
      "List one family or group responsibility to settle before travelling.",
      "Choose one qualified-teacher Hajj or Umrah guide to study before departure.",
    ],
    quiz: [
      {
        question: "What should come before travel logistics?",
        options: [
          "A clear intention and basic source-aware preparation",
          "Only packing and hotel planning",
          "Posting the trip before learning the rites",
        ],
        correctAnswer: "A clear intention and basic source-aware preparation",
        explanation:
          "Sacred travel needs both practical planning and a protected intention. Detailed rulings still need qualified guidance.",
      },
    ],
    audioScript:
      "Before the journey becomes tickets, queues, and movement, return to intention. Ask Allah for a journey of taqwa, patience, and sincere worship.",
  },
  "hajj-and-umrah-preparation-ch-2": {
    subtitle:
      "Learn the rites without pretending a short app lesson is a fatwa",
    estimatedMinutes: 7,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Learning the rites means knowing the shape of the journey before the crowd carries you through it. A user should recognise the broad sequence of ihram, tawaf, sa'i, shaving or trimming for Umrah, and the additional Hajj days and places when performing Hajj. But recognition is not the same as issuing rulings. Details can change with the user's gender, health, menstruation, travel route, chosen package, timing, school of law, and whether the person is doing Hajj or Umrah. NurAI should therefore make the user calmer and better prepared, while clearly directing exact cases to qualified teachers and official guidance.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Mark the parts of the rites you can already explain in simple words, then mark the parts where you would need a teacher before acting. Confidence here means knowing what you know and knowing what still needs verification.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Build a two-column rites checklist: broad step on the left, verified teacher or official source on the right. Do not rely on memory for exceptions, penalties, illness, or timing questions.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor the manners and seriousness of pilgrimage. Use them for spiritual framing, then pair this lesson with a qualified fiqh guide for exact rite details.",
      },
    ],
    reflectionQuestions: [
      "Which rite can you explain clearly, and which still needs a teacher?",
      "What personal circumstance could affect your rulings or timing?",
    ],
    actionSteps: [
      "Create a rites checklist before travel.",
      "Add one qualified source for each step.",
      "Write down three questions to ask before departure.",
    ],
    quiz: [
      {
        question: "What is the safest way to use a short rites lesson?",
        options: [
          "As preparation alongside qualified guidance",
          "As a replacement for fiqh study",
          "As proof that every exception is covered",
        ],
        correctAnswer: "As preparation alongside qualified guidance",
        explanation:
          "A short app lesson can orient the user, but personal cases and exact rite rulings need qualified scholarship.",
      },
    ],
    audioScript:
      "Learn the shape of the rites before you travel, then ask qualified people about the details that affect your own journey.",
  },
  "hajj-and-umrah-preparation-ch-3": {
    subtitle: "Protect taqwa when the crowd, heat, and delays test you",
    estimatedMinutes: 7,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Crowds reveal preparation that books cannot test. A pilgrim may know the steps and still lose patience in queues, transport delays, tiredness, hotel pressure, or family tension. This chapter frames patience as part of the worship, not an inconvenience outside it. The source anchor on Hajj manners warns against indecent speech, wrongdoing, and argument during the sacred journey. That means the user should prepare a behaviour plan before stress arrives: slower speech, fewer complaints, water and rest, care for elders, and accepting that not every delay is a disaster. The aim is a heart that keeps remembering Allah even when the body is hot, crowded, and tired.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Think of your most likely crowd trigger: being pushed, waiting too long, heat, noise, hunger, family disagreement, or fear of missing a schedule. Decide how you want your tongue and body to behave before that moment comes.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose a crowd response plan: one dhikr phrase, one breathing pause, one person you will protect, and one complaint you will leave unsaid unless it is needed for safety.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to connect patience and taqwa with the lived behaviour of pilgrimage. Safety concerns should still be raised clearly and responsibly.",
      },
    ],
    reflectionQuestions: [
      "What crowd situation is most likely to test your tongue?",
      "Who around you might need your patience most during the journey?",
    ],
    actionSteps: [
      "Write one dhikr phrase for queues and delays.",
      "Pack one practical item that protects patience, such as water, medication, or comfortable footwear.",
      "Agree a calm meeting plan with your group before crowded movement.",
    ],
    quiz: [
      {
        question: "What does patience in crowds include?",
        options: [
          "Guarding speech while still handling safety responsibly",
          "Never raising any concern",
          "Winning every argument quickly",
        ],
        correctAnswer:
          "Guarding speech while still handling safety responsibly",
        explanation:
          "Pilgrimage adab includes restraint and patience, while real safety issues should still be addressed.",
      },
    ],
    audioScript:
      "Crowds can become part of the worship when you guard your tongue, protect others, and return to patience before anger takes the lead.",
  },
  "hajj-and-umrah-preparation-ch-4": {
    subtitle: "Turn the return home into a new pattern of worship",
    estimatedMinutes: 7,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The journey does not end when the suitcase comes home. A strong return plan protects the mercy of the trip from being swallowed by old routines. Users should choose a small number of changes that can survive ordinary life: prayer on time, a Quran habit, repaired family ties, cleaner income choices, better speech, or a weekly act of service. The goal is not to perform spirituality for others, but to let the journey leave evidence in private worship and public character. If the user made mistakes during the rites, they should ask qualified scholarship rather than guessing or spiralling into shame.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Picture the first seven days after returning. What old pattern will try to reclaim you first, and what simple act will remind you that Allah allowed you to make the journey?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a seven-day return plan with three anchors: one prayer anchor, one Quran or dhikr anchor, and one relationship or service anchor. Keep it light enough to actually complete.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the verified source cards as reminders that pilgrimage trains taqwa, patience, and a changed life. Keep legal questions separate and ask qualified people when needed.",
      },
    ],
    reflectionQuestions: [
      "What habit should be different one week after you return?",
      "What private act of worship will protect sincerity after people stop asking about the trip?",
    ],
    actionSteps: [
      "Write a seven-day post-journey worship plan.",
      "Choose one relationship to repair or strengthen.",
      "Schedule one review reminder for a month after returning.",
    ],
    quiz: [
      {
        question: "What is the best sign of a meaningful return?",
        options: [
          "A small lasting change in worship and character",
          "Only having many photos",
          "Assuming every mistake is already solved",
        ],
        correctAnswer: "A small lasting change in worship and character",
        explanation:
          "A beneficial journey should continue through steady worship, better conduct, and careful follow-up on unresolved rulings.",
      },
    ],
    audioScript:
      "When you return, protect the journey with a small plan: prayer, Quran, better character, and one private act that only Allah sees.",
  },
  "business-with-barakah-ch-1": {
    subtitle: "Begin the company, project, or side income with a cleaner why",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A Muslim business life begins before invoices, funnels, offers, hires, or profit targets. It begins with intention. Earning can be worship when it is lawful, honest, useful, and kept inside the rights Allah has placed on money and people. The danger is not ambition itself. The danger is ambition becoming detached from accountability: chasing growth while neglecting salah, family rights, truth in marketing, employee dignity, customer trust, or the poor who have rights in wealth. This chapter does not give business fatwas. It trains the founder, freelancer, employee, or seller to ask a better first question: if Allah gave this work barakah, what would it make me more responsible for?",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Look at one income goal you currently want. Is the goal only about more, or does it also include lawful means, service, honesty, family responsibility, sadaqah, and the Hereafter?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a one-sentence work intention for the next seven days. Include how you want to earn, who should benefit, and what boundary you will not cross for money.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on good earnings, zakat care, and seeking good in this world and the Hereafter. For business structures, contracts, doubtful income, tax, investment, debt, and zakat cases, ask a qualified scholar or specialist.",
      },
    ],
    reflectionQuestions: [
      "What would make your current work more sincerely for Allah?",
      "Which boundary is most at risk when pressure for money increases?",
    ],
    actionSteps: [
      "Write one work intention that mentions lawful earning and service.",
      "Choose one money boundary you will protect this week.",
      "Review one offer, invoice, or sales message for honesty before sending it.",
    ],
    quiz: [
      {
        question: "What is the first barakah question for business?",
        options: [
          "Whether the work is lawful, honest, useful, and accountable to Allah",
          "Whether it grows at any cost",
          "Whether it makes people admire the owner",
        ],
        correctAnswer:
          "Whether the work is lawful, honest, useful, and accountable to Allah",
        explanation:
          "Barakah in work begins with intention, lawful means, service, honesty, and remembering accountability.",
      },
    ],
    audioScript:
      "Before the target, clean the intention. Ask Allah for work that is lawful, honest, useful, and heavy with barakah.",
  },
  "business-with-barakah-ch-2": {
    subtitle: "Make agreements clear before money changes hands",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Fair contracts are not only legal paperwork. They are a form of adab with people's money, time, expectations, and trust. A Muslim should not enjoy ambiguity when ambiguity benefits the stronger side. Before work begins, clarify what is being sold, what is not included, the price, payment timing, delivery expectations, refund or cancellation rules, ownership, confidentiality, and what happens if circumstances change. The point is not to make every relationship cold. The point is to prevent avoidable harm. If a contract involves interest, loans, investments, revenue share, partnership equity, penalties, insurance, employment rights, or cross-border tax, the app must not guess. Those questions need qualified legal and Islamic review.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where are your agreements currently vague: scope, price, deadlines, refund terms, responsibilities, ownership, or what happens when someone cannot deliver?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Pick one active agreement and write a plain-language summary: who owes what, by when, for how much, and what is not included. Share it before the next payment or delivery if appropriate.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect wealth with responsibility and the Hereafter. They are not a contract template. Use qualified advice for complex commercial terms and Islamic finance questions.",
      },
    ],
    reflectionQuestions: [
      "Who could be harmed if an agreement stays vague?",
      "Which term would you be embarrassed to explain clearly?",
    ],
    actionSteps: [
      "List the scope, price, deadline, and exclusion for one agreement.",
      "Remove one unclear promise from a sales page or proposal.",
      "Flag one complex term for qualified legal or scholarly review.",
    ],
    quiz: [
      {
        question: "Why should business agreements be clear?",
        options: [
          "To protect trust and prevent avoidable harm",
          "To make it easier to exploit confusion",
          "To avoid ever needing expert review",
        ],
        correctAnswer: "To protect trust and prevent avoidable harm",
        explanation:
          "Clear agreements protect both sides and reduce disputes over money, scope, and expectations.",
      },
    ],
    audioScript:
      "Write the agreement clearly before the pressure arrives. Clarity is mercy for both sides of the transaction.",
  },
  "business-with-barakah-ch-3": {
    subtitle: "Let marketing, delivery, and support tell the same truth",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Customer trust is built when the promise, the product, and the follow-up match each other. A Muslim business should not use exaggeration as a growth strategy. Avoid claims you cannot prove, scarcity you created only to pressure people, testimonials that are edited beyond truth, hidden conditions, confusing subscriptions, and support systems that disappear after payment. Trust also includes admitting limits: who the product is not for, what results are not guaranteed, and when a refund or apology is due. This is especially important for religious, health, finance, education, and family products, where a false claim can damage more than a customer's wallet.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Read one public claim from your business or work. Would a cautious customer understand the real limits, costs, risks, and expected outcome from that claim?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Audit one sales message, product page, onboarding screen, or support reply. Remove one exaggeration, add one clear limit, and make the next step easier to understand.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards as a reminder that wealth is tied to accountability. Exact rulings on marketing methods, subscriptions, warranties, or regulated products need qualified review.",
      },
    ],
    reflectionQuestions: [
      "Which promise needs more evidence or a clearer limit?",
      "Where could a customer feel trapped, misled, or ignored after paying?",
    ],
    actionSteps: [
      "Remove one unsupported claim from customer-facing copy.",
      "Add a clear limit or expectation to one offer.",
      "Review one support flow from the customer's point of view.",
    ],
    quiz: [
      {
        question: "What is a trust-first approach to business claims?",
        options: [
          "State benefits clearly without hiding limits or exaggerating outcomes",
          "Use any claim that increases conversion",
          "Make support difficult after payment",
        ],
        correctAnswer:
          "State benefits clearly without hiding limits or exaggerating outcomes",
        explanation:
          "Trust grows when marketing, product delivery, and customer support tell the same truth.",
      },
    ],
    audioScript:
      "Let the promise and the delivery match. Barakah is not helped by exaggeration, pressure, or hidden terms.",
  },
  "business-with-barakah-ch-4": {
    subtitle: "Measure success by what profit does to your worship and rights",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Profit is not automatically a problem, and poverty is not automatically piety. The question is what profit does to the person, the team, the customer, the family, and the obligations attached to wealth. A healthier business review asks: were people paid fairly and on time, were customers told the truth, were prayers protected, were family rights neglected, were debts recorded, was zakat or charity handled responsibly, and did growth make the heart more grateful or more arrogant? Do not use this chapter to calculate zakat or decide complex wealth rulings. Use it to build a monthly accountability review, then take specific financial questions to qualified people.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "If your income increased next month, which part of your deen would be most tested: gratitude, salah, family time, generosity, pride, debt, spending, or honesty?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a monthly barakah review with five checks: worship protected, people treated fairly, claims truthful, records clean, and giving or zakat questions prepared for proper review.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards point to good earnings, zakat categories, and dua for good in both worlds. Treat financial calculations, recipient eligibility, investment screening, and business-zakat cases as scholar-review topics.",
      },
    ],
    reflectionQuestions: [
      "What does profit currently make easier for you, and what does it make harder?",
      "Which financial question should be taken to a qualified person instead of guessed?",
    ],
    actionSteps: [
      "Schedule one monthly barakah review.",
      "Write down one unresolved financial or zakat question.",
      "Choose one act of gratitude connected to recent income.",
    ],
    quiz: [
      {
        question:
          "How should profit be reviewed Islamically at a beginner level?",
        options: [
          "By checking worship, rights, honesty, records, gratitude, and unresolved rulings",
          "By assuming more money always means more barakah",
          "By ignoring zakat and people's rights",
        ],
        correctAnswer:
          "By checking worship, rights, honesty, records, gratitude, and unresolved rulings",
        explanation:
          "Profit should be handled with gratitude, accountability, clear records, and qualified guidance where rulings are complex.",
      },
    ],
    audioScript:
      "Measure profit by what it does to your worship, your rights, your records, and your heart before Allah.",
  },
  "hadith-in-daily-life-ch-1": {
    subtitle: "Treat prophetic words as an amanah, not decoration",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Hadith should not be used as inspirational decoration with no source, no context, and no care. A report attributed to the Prophet ﷺ carries a trust. Before sharing it, the user should ask: do I know where it comes from, is the wording reliable, what does it actually mean, and am I using it in a way that scholars would recognise? This chapter does not turn the user into a hadith grader. It teaches restraint. If a quote has no reference, unclear translation, unknown grade, or a dramatic claim attached to it, slow down. Loving the Sunnah includes refusing to spread what we cannot verify.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Think of the last religious quote you forwarded, posted, or saved. Did it include a clear source, or did it only feel moving?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Before sharing one hadith-style quote this week, find its exact source in a reliable collection or do not share it. If unsure, label it as unverified and ask someone qualified.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to remember that speech, harm, and the prophetic example are serious. Exact authentication, variant wording, and legal application need recognised scholarship.",
      },
    ],
    reflectionQuestions: [
      "Where do you need more restraint before quoting religious text?",
      "What source habit would make your sharing safer?",
    ],
    actionSteps: [
      "Check one saved quote for an exact source before sharing it.",
      "Remove or correct one unsourced religious quote from your notes if needed.",
      "Create a personal rule: no hadith sharing without reference.",
    ],
    quiz: [
      {
        question: "What is the safest first rule for sharing hadith?",
        options: [
          "Do not share unless the source and meaning are responsibly checked",
          "Share anything that sounds spiritual",
          "Remove every reference so posts look cleaner",
        ],
        correctAnswer:
          "Do not share unless the source and meaning are responsibly checked",
        explanation:
          "Hadith sharing is an amanah. A user should verify sources and avoid careless attribution to the Prophet ﷺ.",
      },
    ],
    audioScript:
      "Do not quote carelessly. Love for the Sunnah includes verifying, asking, and staying quiet when the source is unclear.",
  },
  "hadith-in-daily-life-ch-2": {
    subtitle: "Move from source to practice with humility",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A hadith is not meant to remain as a beautiful line on a screen. It should guide worship, character, restraint, mercy, and obedience. But moving from source to practice requires humility. Some hadith are direct and easy to act on, such as guarding the tongue or being kind. Others sit inside legal chapters, scholarly disagreement, specific circumstances, or Arabic wording that a beginner should not flatten into a quick ruling. A healthy method is simple: verify the source, read a reliable explanation when possible, identify the broad character lesson, and ask qualified people before applying it to fiqh, family disputes, wealth, health, or public claims.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Choose one hadith you know. Is its most obvious practice about speech, prayer, patience, mercy, honesty, family, or something that needs expert explanation?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Turn one verified hadith into a low-risk action today: safer speech, a kinder reply, an avoided harm, a small act of service, or a moment of sincere repentance.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards point to speech, safety, and the prophetic example. Use them for character practice, while keeping complex rulings with qualified scholarship.",
      },
    ],
    reflectionQuestions: [
      "Which verified hadith can become a character action today?",
      "Which hadith topic should you not apply alone without explanation?",
    ],
    actionSteps: [
      "Pick one verified hadith and write its broad character lesson.",
      "Do one low-risk action connected to that lesson.",
      "Save one question for a teacher if the application is legal or personal.",
    ],
    quiz: [
      {
        question: "How should a beginner move from hadith to practice?",
        options: [
          "Verify, seek explanation, act on clear character lessons, and ask on complex rulings",
          "Turn every hadith into an instant personal fatwa",
          "Avoid acting on any hadith ever",
        ],
        correctAnswer:
          "Verify, seek explanation, act on clear character lessons, and ask on complex rulings",
        explanation:
          "Hadith should shape life, but application requires source care, context, and qualified help for complex matters.",
      },
    ],
    audioScript:
      "Let a verified hadith become one safe action: a guarded tongue, a kinder reply, a harm avoided, or a mercy shown.",
  },
  "hadith-in-daily-life-ch-3": {
    subtitle: "Respect grading, context, and the limits of quick answers",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Hadith grades and context protect the community from treating every circulating quote the same. A beginner does not need to memorise technical sciences before benefiting from hadith, but they do need adab with limits. Sahih, hasan, da'if, fabricated, chapter context, narrator discussions, variant wording, and scholarly usage are not social-media details. They affect how a report is taught, acted on, or avoided. NurAI should never present a shaky quote as certain or use a hadith to pressure a user without context. When unsure, the safer answer is honest: this needs verification. That honesty is not weakness. It is part of protecting the Prophet's ﷺ words.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where do you most often meet hadith claims: short videos, family messages, lectures, books, app notifications, or social posts? Which source gives you the least context?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a simple hadith note format: exact reference, translation source, grade or collection status if available, short explanation, and questions to ask before applying it.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards as examples of exact references. Do not infer authenticity rules beyond what recognised hadith scholarship establishes.",
      },
    ],
    reflectionQuestions: [
      "Which hadith claim in your notes needs a better reference or explanation?",
      "How can you make uncertainty visible instead of hiding it?",
    ],
    actionSteps: [
      "Convert one hadith note into the exact-reference format.",
      "Add a needs-review label to one report you cannot verify.",
      "Avoid using unverifiable reports in advice to others.",
    ],
    quiz: [
      {
        question: "Why do grading and context matter?",
        options: [
          "They protect how hadith are taught, trusted, and applied",
          "They are irrelevant if a quote sounds good",
          "They let beginners ignore scholars",
        ],
        correctAnswer:
          "They protect how hadith are taught, trusted, and applied",
        explanation:
          "Hadith sciences guard attribution, meaning, and application. Uncertainty should be shown honestly.",
      },
    ],
    audioScript:
      "A careful Muslim does not hide uncertainty. Exact references, context, and qualified scholarship protect the words we love.",
  },
  "hadith-in-daily-life-ch-4": {
    subtitle: "Build a small, verified Sunnah habit you can keep",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A hadith habit does not have to begin with a huge reading plan. It can begin with one verified report, one reliable explanation, and one repeated action. The aim is not to collect quotations faster than the heart can absorb them. The aim is to let the Sunnah shape speech, worship, mercy, honesty, patience, and daily choices. Choose a small set of hadith with exact sources and trustworthy explanations. Review them slowly. Act on the clear character lessons. Keep a list of topics that require a teacher. Over time, the user should become less impressed by unsourced quotes and more attached to verified knowledge, steady practice, and humility.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What kind of Sunnah habit would change your week most: guarding speech, keeping promises, serving family, salah consistency, mercy, patience, or seeking knowledge?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one verified hadith for the week. Read it once daily, practise one clear action from it, and write one question if the meaning or application is unclear.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support exact-reference learning and character practice. A personal hadith routine should stay humble and connected to qualified teachers.",
      },
    ],
    reflectionQuestions: [
      "Which one hadith should become a repeated action this week?",
      "Who can you ask when a hadith raises a question you cannot answer?",
    ],
    actionSteps: [
      "Pick one exact-source hadith for seven days.",
      "Practise one clear action from it daily.",
      "Write one teacher question if the hadith touches a complex area.",
    ],
    quiz: [
      {
        question: "What makes a hadith habit safe and useful?",
        options: [
          "Exact sources, reliable explanation, small action, and humility",
          "Many unsourced quotes saved quickly",
          "Using hadith to win arguments",
        ],
        correctAnswer:
          "Exact sources, reliable explanation, small action, and humility",
        explanation:
          "A useful hadith habit grows through verified knowledge, practice, and careful questions.",
      },
    ],
    audioScript:
      "Build the habit slowly: one verified hadith, one trusted explanation, one repeated action, and one humble question when needed.",
  },
  "fiqh-foundations-without-overwhelm-ch-1": {
    subtitle: "Understand fiqh as guided worship, not argument fuel",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Fiqh is the careful work of understanding how Allah's guidance is lived through worship, transactions, family, food, purification, and daily choices. For a beginner, the first step is not to collect opinions for arguments. It is to become humble enough to ask, learn, and act responsibly. Fiqh protects worship from guesswork, but it also protects people from using religion without knowledge. This chapter should lower panic and raise seriousness. A user does not need to master every detail before praying, fasting, buying, selling, or asking questions. They do need a reliable path: basic learning, trusted teachers, honest questions, and the courage to say, I do not know.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where do you feel most unsure about practice: purification, salah, fasting, money, family, food, travel, or online advice? Name the area without shame.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one fiqh area to stabilise this month. Do not chase every debate. Pick one reliable teacher, class, or text and write the first question you need answered.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on seeking knowledge and human capacity as guardrails. This app gives orientation, not final rulings for personal cases.",
      },
    ],
    reflectionQuestions: [
      "Which area of practice needs calmer, more reliable learning?",
      "Where have you been tempted to argue before understanding?",
    ],
    actionSteps: [
      "Pick one fiqh topic to learn this month.",
      "Choose one qualified source instead of browsing many clips.",
      "Write one clear question with facts, not emotion only.",
    ],
    quiz: [
      {
        question: "What is the safest beginner posture toward fiqh?",
        options: [
          "Learn humbly from qualified sources and avoid guessing",
          "Collect opinions to win arguments",
          "Ignore fiqh because details feel stressful",
        ],
        correctAnswer: "Learn humbly from qualified sources and avoid guessing",
        explanation:
          "Fiqh helps a Muslim worship and live responsibly. Beginners should learn basics and ask qualified people about details.",
      },
    ],
    audioScript:
      "Fiqh is not argument fuel. It is the careful path of learning how to worship and live with knowledge.",
  },
  "fiqh-foundations-without-overwhelm-ch-2": {
    subtitle: "See scholarly differences as a reason for adab",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Muslims may meet different answers on details of worship and daily life. That can feel confusing, especially online, but difference does not always mean someone is careless. Scholars may differ because they weigh evidence, language, principles, context, or inherited schools of law differently. A beginner should not turn every difference into suspicion or self-invented selection. The safer path is to learn with a reliable teacher or recognised school, ask why when needed, and keep adab with Muslims who follow qualified scholarship differently. Not every difference is valid, and not every internet answer is scholarship. But the solution is not panic. The solution is knowledge, humility, and consistency.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Think of one ruling where you heard more than one answer. Did the difference make you seek knowledge, or did it make you judge people too quickly?",
      },
      {
        type: "action",
        heading: "Act",
        body: "For one confusing issue, write down the exact question, what you heard, who said it, and what facts might affect the answer. Then ask a qualified person instead of deciding from comments.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards point to seeking knowledge and acting within capacity. They do not validate every opinion. Use qualified scholarship to sort differences.",
      },
    ],
    reflectionQuestions: [
      "Where do you need more adab with valid scholarly difference?",
      "Which issue should you stop researching randomly and ask properly?",
    ],
    actionSteps: [
      "Turn one confusing ruling into a clear written question.",
      "Identify whether personal facts affect the answer.",
      "Ask one qualified teacher or local scholar for direction.",
    ],
    quiz: [
      {
        question: "How should a beginner handle scholarly differences?",
        options: [
          "With adab, reliable learning, and qualified guidance",
          "By assuming every difference is fake",
          "By picking only the easiest answer without understanding",
        ],
        correctAnswer: "With adab, reliable learning, and qualified guidance",
        explanation:
          "Differences require knowledge and humility. A beginner should avoid suspicion, random selection, and online argument.",
      },
    ],
    audioScript:
      "Difference should make you more humble, not more reckless. Ask clearly, learn reliably, and keep adab.",
  },
  "fiqh-foundations-without-overwhelm-ch-3": {
    subtitle: "Use madhhab awareness to become steadier, not tribal",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A madhhab is not a team badge for attacking other Muslims. It is a disciplined legal tradition that helps people learn and practise without reinventing rulings alone. Many users will not know their family's school, local mosque approach, or which teacher they should follow. This chapter gives a calm first step: find a qualified path that is recognised, consistent, and suitable for your community and circumstances. Madhhab awareness reduces confusion when prayer details, purification, travel, zakat, marriage, or business questions arise. It should also reduce arrogance. If someone follows qualified scholarship differently, the user should not mock them or turn a detail into a character verdict.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Do you know which fiqh approach your mosque, teacher, or family normally follows? If not, who could help you understand that without pressure?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Ask one trusted local teacher what beginner fiqh path is suitable for your situation. Write down the recommended class, text, or approach and why it fits.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to keep learning tied to humility and capacity. This chapter explains orientation, not a verdict on which madhhab every user must follow.",
      },
    ],
    reflectionQuestions: [
      "What would become easier if your fiqh learning path were consistent?",
      "Where do you need to avoid turning fiqh identity into arrogance?",
    ],
    actionSteps: [
      "Ask a qualified teacher about a suitable beginner fiqh path.",
      "Write down one recommended resource and why it fits you.",
      "Avoid criticising another Muslim's valid practice without knowledge.",
    ],
    quiz: [
      {
        question: "What should madhhab awareness produce?",
        options: [
          "Steadier learning, humility, and less confusion",
          "Tribal arguments and mockery",
          "Rejecting qualified scholarship",
        ],
        correctAnswer: "Steadier learning, humility, and less confusion",
        explanation:
          "A disciplined fiqh path can help users practise consistently while keeping adab with qualified difference.",
      },
    ],
    audioScript:
      "A madhhab is a path for disciplined learning, not a weapon. Let it make you steadier and more humble.",
  },
  "fiqh-foundations-without-overwhelm-ch-4": {
    subtitle: "Ask questions that give scholars enough truth to answer",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Many fiqh questions become confusing because they are asked with missing facts. A better question helps the scholar help the user. Instead of asking, 'is this allowed?' with no context, include the relevant details: what happened, dates, amounts, ownership, intention, ability, harm, local circumstances, school or teacher followed, and what has already been done. Keep private details necessary but respectful. Do not shop for a softer answer after receiving serious advice. Do not hide facts that might change the ruling. The app can help the user prepare a question, but it should not pretend to replace qualified people for sensitive matters.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Think of one unresolved question. What fact have you not written down clearly enough for someone qualified to answer responsibly?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Use a question template: topic, facts, dates or amounts if relevant, what you already did, who is affected, urgency, and what answer you need. Then take it to a qualified source.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support learning and honesty within capacity. Personal rulings, disputes, medical cases, wealth, marriage, divorce, and worship exceptions need qualified review.",
      },
    ],
    reflectionQuestions: [
      "Which missing fact could change the answer to your question?",
      "Are you asking to obey Allah or only to find the easiest option?",
    ],
    actionSteps: [
      "Prepare one fiqh question using the facts template.",
      "Add what you have already done and who is affected.",
      "Send it to a qualified teacher or scholar rather than an anonymous thread.",
    ],
    quiz: [
      {
        question: "What makes a fiqh question better?",
        options: [
          "Clear facts, relevant context, honesty, and qualified review",
          "Hiding details to get the answer you want",
          "Asking strangers with no context",
        ],
        correctAnswer:
          "Clear facts, relevant context, honesty, and qualified review",
        explanation:
          "Good questions help scholars answer responsibly. Missing facts can change practical rulings.",
      },
    ],
    audioScript:
      "A better question is an act of honesty: clear facts, relevant context, and a sincere desire to obey Allah.",
  },
  "halal-wealth-and-work-ch-1": {
    subtitle: "Join effort to trust without worshipping either one",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Rizq belongs to Allah, but that truth does not make effort meaningless. A Muslim works, applies, sells, studies, negotiates, saves, gives, and improves skills while knowing that provision is not finally controlled by the self. This balance protects two extremes: laziness dressed up as tawakkul, and anxiety dressed up as ambition. Lawful work should make the user more responsible, not more frantic. Before chasing more, ask whether the current work protects salah, honesty, family rights, health, and lawful boundaries. If an income path requires deception, exploitation, forbidden transactions, or neglect of obligations, more money is not a cleaner answer.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where do you lean most right now: avoiding effort while claiming reliance, or relying on effort so heavily that your heart forgets Allah?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one lawful effort for this week and pair it with one act of reliance: dua before applying, honesty before selling, prayer before a decision, or gratitude after income arrives.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on good earnings, wealth responsibility, and good in both worlds. Personal income structures and doubtful work cases need qualified review.",
      },
    ],
    reflectionQuestions: [
      "What lawful effort do you need to take more seriously?",
      "Where does income anxiety make you forget Allah's control?",
    ],
    actionSteps: [
      "Pick one lawful work action for the next seven days.",
      "Make dua before taking that action.",
      "Check that the action does not require dishonesty or neglected obligations.",
    ],
    quiz: [
      {
        question: "What is the balanced approach to rizq and effort?",
        options: [
          "Work lawfully while relying on Allah",
          "Avoid effort and call it tawakkul",
          "Trust effort as if it controls every outcome",
        ],
        correctAnswer: "Work lawfully while relying on Allah",
        explanation:
          "A Muslim takes lawful means while knowing provision ultimately belongs to Allah.",
      },
    ],
    audioScript:
      "Take the lawful step, then leave the outcome with Allah. Effort and reliance belong together.",
  },
  "halal-wealth-and-work-ch-2": {
    subtitle: "Make your desk, rota, and inbox places of amanah",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Integrity at work is often tested in small, repeatable moments: timekeeping, expenses, promises, confidentiality, client data, sick leave, quality control, credit for other people's work, and how someone speaks when the manager is absent. Halal income is not only about the industry name. It also includes the conduct inside the role. A Muslim should not normalise tiny betrayals because everyone else does them. If the workplace itself involves questionable products, interest-based structures, fraud, harmful services, or legal/ethical conflict, do not rely on a short app lesson. Gather facts and ask qualified people. But for everyday amanah, begin with what is already clear: be truthful, fulfil duties, and do not take what is not yours.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which part of your work trust is most vulnerable: time, money, speech, data, quality, promises, or treating people fairly?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Audit one normal workday. Note one place where you can be more trustworthy without needing a new job, new ruling, or public announcement.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards frame wealth and work as accountable. Ask qualified scholars about unclear industries, contracts, and income sources.",
      },
    ],
    reflectionQuestions: [
      "What would your work look like if amanah was visible in small details?",
      "Which unclear work question needs proper advice instead of guessing?",
    ],
    actionSteps: [
      "Choose one trust point to improve this week.",
      "Correct one avoidable work shortcut.",
      "Write down one complex income question for qualified review.",
    ],
    quiz: [
      {
        question: "Where does workplace integrity show up?",
        options: [
          "In small duties like time, money, speech, data, quality, and promises",
          "Only in large public scandals",
          "Only when someone is watching",
        ],
        correctAnswer:
          "In small duties like time, money, speech, data, quality, and promises",
        explanation:
          "Amanah at work is built through repeated truthful and responsible conduct.",
      },
    ],
    audioScript:
      "Make the ordinary workday an amanah: time, speech, money, data, promises, and quality under Allah's sight.",
  },
  "halal-wealth-and-work-ch-3": {
    subtitle: "Do not let doubtful income hide behind speed or pressure",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Some income questions are obvious, and some need careful review. Doubtful paths often become dangerous because they are wrapped in urgency: limited-time investments, vague affiliate schemes, hidden fees, crypto promises, interest-based contracts, gambling-like mechanics, misleading ads, adult or harmful products, exploitation, and partnerships where nobody can explain how money is actually made. A user should not self-certify a complex opportunity because it feels profitable or because another Muslim is doing it. The first step is not panic. It is documentation: what is sold, who pays, where profit comes from, what risk exists, what contract terms say, and which scholar or specialist can review it.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Is there any income path you avoid examining because it is profitable, socially normal, or emotionally hard to leave?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a doubtful-income review note for one opportunity: product, payment flow, contract, risk, who benefits, possible harm, and the exact question to ask a qualified reviewer.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to remember that good earnings and the Hereafter belong together. Do not make rulings on doubtful income from app coaching alone.",
      },
    ],
    reflectionQuestions: [
      "Which opportunity needs facts gathered before you can judge it?",
      "What pressure makes you want a quick yes instead of a careful answer?",
    ],
    actionSteps: [
      "Write the payment flow for one unclear income source.",
      "Collect the contract or terms before asking for advice.",
      "Pause promotion or recruitment if the model cannot be explained clearly.",
    ],
    quiz: [
      {
        question: "What is the first step with a doubtful income path?",
        options: [
          "Document the facts and seek qualified review",
          "Assume profit makes it fine",
          "Hide the details and continue quickly",
        ],
        correctAnswer: "Document the facts and seek qualified review",
        explanation:
          "Complex income questions need facts, patience, and qualified guidance rather than pressure-driven guesses.",
      },
    ],
    audioScript:
      "When money feels urgent, slow down. Gather the facts, name the risk, and ask before your income gets tangled.",
  },
  "halal-wealth-and-work-ch-4": {
    subtitle: "Let giving cleanse ambition instead of replacing obligation",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Giving from what you love trains the heart not to be owned by wealth. But voluntary generosity does not replace obligations, and good intentions do not fix careless finances. A Muslim should separate sadaqah, zakat, debts, family duties, employee or supplier payments, and restricted donations. Pay people what is owed. Keep records. Ask about zakat if wealth, business stock, investments, receivables, gold, crypto, pensions, or debts are involved. Then give voluntarily with sincerity and wisdom. The goal is not to perform generosity for branding. The goal is to let wealth move through the hand without settling as arrogance in the heart.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "When money comes in, which is most neglected: gratitude, records, debts, zakat questions, family rights, staff/supplier payments, or private sadaqah?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a wealth-rights checklist: debts, owed payments, family responsibilities, zakat questions, sadaqah intention, and one private act of giving if able.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards point to good earnings and zakat categories. Zakat calculation and recipient eligibility require current values and qualified guidance.",
      },
    ],
    reflectionQuestions: [
      "What right attached to your wealth needs more care?",
      "How can giving become more sincere and less performative?",
    ],
    actionSteps: [
      "List what is owed before planning extra giving.",
      "Write one zakat or wealth question for qualified review.",
      "Make one private sadaqah intention if you are able.",
    ],
    quiz: [
      {
        question: "How should giving relate to financial obligations?",
        options: [
          "Voluntary giving should sit alongside debts, zakat care, and people's rights",
          "Sadaqah cancels the need for records or zakat questions",
          "Generosity is only useful when public",
        ],
        correctAnswer:
          "Voluntary giving should sit alongside debts, zakat care, and people's rights",
        explanation:
          "A Muslim should give sincerely while still handling debts, zakat, family duties, and other rights responsibly.",
      },
    ],
    audioScript:
      "Let wealth pass through clean hands: pay rights, ask about zakat, give sincerely, and keep the heart free.",
  },
  "marriage-with-mercy-ch-1": {
    subtitle: "Let mercy speak before pride writes the script",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Marriage in Islam is not built on ego winning every scene. The Quranic language of tranquillity, affection, and mercy should shape the way spouses enter ordinary pressure: tired evenings, finances, in-laws, parenting, intimacy, chores, work stress, and disappointment. Mercy does not mean accepting harm, hiding abuse, or erasing rights. It means that when a conflict is normal and safe, the first instinct should not be humiliation, scorekeeping, sarcasm, or public exposure. A spouse should ask: what would protect dignity here, what right must still be fulfilled, what apology is due, and what tone would I not be ashamed of before Allah?",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "In a recent disagreement, did your words aim to solve the issue, protect dignity, punish, win, or make the other person feel small?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one mercy-before-ego phrase for the next conflict: help me understand, I need a pause, I was wrong there, or let us solve this without hurting each other.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards for mercy, affection, and kindness. Abuse, coercion, legal rights, divorce, and safety concerns need qualified and professional help, not app coaching alone.",
      },
    ],
    reflectionQuestions: [
      "Which ego habit harms mercy most in your close relationships?",
      "What boundary is needed to keep mercy from becoming silence about harm?",
    ],
    actionSteps: [
      "Pick one mercy phrase before the next disagreement.",
      "Apologise for one specific harmful word if needed.",
      "Seek urgent help if safety, coercion, or abuse is present.",
    ],
    quiz: [
      {
        question: "What does mercy before ego mean in marriage?",
        options: [
          "Protecting dignity while still respecting rights and safety",
          "Accepting harm without help",
          "Winning arguments more politely",
        ],
        correctAnswer:
          "Protecting dignity while still respecting rights and safety",
        explanation:
          "Mercy should soften conflict, not erase rights, safety, or the need for qualified help.",
      },
    ],
    audioScript:
      "Before pride speaks, remember mercy. Solve what is safe to solve, protect dignity, and seek help where harm is present.",
  },
  "marriage-with-mercy-ch-2": {
    subtitle: "Listen to understand the wound, not prepare the comeback",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Many marital arguments continue because both people are replying to the accusation but nobody is hearing the fear, disappointment, exhaustion, or need underneath it. Listening without winning does not mean agreeing with every claim or surrendering to unfairness. It means delaying the comeback long enough to understand what is being said. A spouse can ask, what did you mean by that, what hurt you most, what do you need from me now, and what part is my responsibility? In unsafe relationships, listening skills are not enough and may even be misused. But in normal conflict, careful listening can turn a battle into a repair conversation.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "When your spouse or family member complains, do you usually defend, counterattack, shut down, minimise, or ask what they are really feeling?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Practise a two-minute listening rule in one safe conversation: repeat what you heard, ask if you understood, then respond after they confirm or correct it.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards point to kindness and mercy. For serious conflict, repeated contempt, threats, or harm, involve trusted qualified support.",
      },
    ],
    reflectionQuestions: [
      "What comeback do you reach for too quickly?",
      "What question could help you understand before defending?",
    ],
    actionSteps: [
      "Use the two-minute listening rule once.",
      "Repeat the other person's concern before answering.",
      "Pause the conversation if either person becomes unsafe or cruel.",
    ],
    quiz: [
      {
        question: "What is the aim of listening without winning?",
        options: [
          "Understanding before responding while preserving safety and truth",
          "Letting every accusation stand forever",
          "Waiting silently only to attack later",
        ],
        correctAnswer:
          "Understanding before responding while preserving safety and truth",
        explanation:
          "Listening can repair normal conflict, but it does not replace safety, rights, or qualified help in serious cases.",
      },
    ],
    audioScript:
      "Listen long enough to understand what is hurting. A calmer answer often begins with hearing clearly.",
  },
  "marriage-with-mercy-ch-3": {
    subtitle: "Learn rights as worship, not as weapons",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Marital rights matter because Allah made people responsible for one another. But rights can be misused when someone studies only the other person's obligations and ignores their own. A mercy-based approach asks: what has Allah made me responsible for, what rights am I neglecting, and where do I need qualified fiqh guidance before speaking with certainty? Financial duties, intimacy, obedience, kindness, privacy, in-law boundaries, household labour, contraception, separation, divorce, and harm can all become detailed and personal. The app should not issue rulings from a short chapter. It should help the user prepare honest questions, seek qualified scholarship, and avoid weaponising religion in a relationship.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "When you think of marital rights, do you first think of what you are owed or what you owe before Allah?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write two lists privately: one right you need to understand better, and one duty you already know you should improve. Take the unclear right to a qualified teacher.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards as ethical anchors. Detailed rights, disputes, and legal outcomes require qualified Islamic and sometimes legal/professional advice.",
      },
    ],
    reflectionQuestions: [
      "Which duty are you avoiding while focusing on what you are owed?",
      "Which rights question is too personal or complex for an app answer?",
    ],
    actionSteps: [
      "Write one duty you can improve this week.",
      "Write one rights question with honest context.",
      "Ask a qualified teacher before using a ruling in conflict.",
    ],
    quiz: [
      {
        question: "How should marital rights be learned?",
        options: [
          "As responsibilities before Allah with qualified guidance for details",
          "As weapons for winning arguments",
          "Only by asking social media",
        ],
        correctAnswer:
          "As responsibilities before Allah with qualified guidance for details",
        explanation:
          "Rights protect people, but personal cases need knowledge, context, and qualified review.",
      },
    ],
    audioScript:
      "Learn rights with humility. Ask what Allah made you responsible for before using religion in an argument.",
  },
  "marriage-with-mercy-ch-4": {
    subtitle: "Know when love needs outside help and real protection",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Some marriage problems can be repaired through apology, better listening, counselling, family support, and qualified Islamic advice. Other situations need protection first: violence, threats, coercion, forced sex, severe control, stalking, financial abuse, isolation, child harm, self-harm risk, or repeated intimidation. Mercy never means leaving someone unsafe. A good app must not push users to endure harm for the sake of a spiritual slogan. It should encourage careful escalation: trusted family or community support when appropriate, qualified scholars, professional counselling, legal advice, emergency services, and safeguarding help where needed. The user's life, dignity, deen, and children are not side issues.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Is the issue a normal conflict pattern, or does it involve fear, control, threats, violence, coercion, or harm to children?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a help map before crisis: one trusted person, one qualified Islamic contact, one professional support option, and emergency services for immediate danger.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards remind users of kindness and mercy, but safety cases need real-world support. Do not use this chapter to delay urgent help.",
      },
    ],
    reflectionQuestions: [
      "What sign would mean this situation needs outside help now?",
      "Who is a safe and trustworthy person to contact if things escalate?",
    ],
    actionSteps: [
      "Write a private support map with safe contacts.",
      "Use emergency services if there is immediate danger.",
      "Seek qualified advice for separation, divorce, rights, or safeguarding questions.",
    ],
    quiz: [
      {
        question: "When should outside help be prioritised?",
        options: [
          "When there is fear, control, coercion, violence, threats, or child harm",
          "Only after years of harm",
          "Never, because mercy means staying silent",
        ],
        correctAnswer:
          "When there is fear, control, coercion, violence, threats, or child harm",
        explanation:
          "Mercy does not require silence about harm. Safety and qualified support come first in serious cases.",
      },
    ],
    audioScript:
      "Mercy is not silence about harm. When there is fear, coercion, violence, or danger, seek protection and qualified help.",
  },
  "women-in-islam-a-careful-introduction-ch-1": {
    subtitle: "Begin with worship, dignity, and accountability before debate",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A careful introduction to women in Islam should not begin with culture-war slogans, stereotypes, or defensive soundbites. It should begin where the Quran anchors believers: Muslim men and Muslim women are addressed as servants of Allah, responsible for faith, worship, truthfulness, patience, humility, charity, fasting, chastity, remembrance, and reward. Dignity is not borrowed from public approval, and accountability is not removed by social pressure. This chapter does not answer every legal, historical, or social question. It gives the user a safer starting point: women are not side characters in Islam, and serious questions deserve serious sources, not recycled outrage.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What shaped your first assumptions about Muslim women: family culture, media, bad experiences, online arguments, a teacher, or the Quran and reliable scholarship?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one assumption you need to re-check from real sources. Pair it with one Quran or hadith source and one qualified teacher or reliable course to study later.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to ground dignity, capacity, and seeking knowledge. Legal rulings and personal cases need qualified scholarship and context.",
      },
    ],
    reflectionQuestions: [
      "Which assumption about Muslim women needs better sourcing?",
      "How can dignity and accountability both stay present in your thinking?",
    ],
    actionSteps: [
      "Write one assumption to re-check.",
      "Attach one verified source to the question.",
      "Choose one qualified learning path instead of relying on arguments.",
    ],
    quiz: [
      {
        question: "Where should a careful introduction begin?",
        options: [
          "With worship, dignity, accountability, and reliable sources",
          "With stereotypes and social-media arguments",
          "With culture alone as the final authority",
        ],
        correctAnswer:
          "With worship, dignity, accountability, and reliable sources",
        explanation:
          "A responsible introduction begins with Quranic dignity, worship, and careful learning rather than reactionary claims.",
      },
    ],
    audioScript:
      "Begin with dignity before debate. Muslim women are servants of Allah addressed with worship, responsibility, and reward.",
  },
  "women-in-islam-a-careful-introduction-ch-2": {
    subtitle: "Learn before repeating assumptions from culture or the internet",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Many questions about women in Islam are mixed with culture, family pain, partial quotes, translation issues, social pressure, and real harm. A careful learner separates what is revelation, what is scholarly interpretation, what is cultural practice, what is personal misuse, and what is an unresolved question needing qualified help. That separation takes humility. It is unfair to dismiss sincere questions, and it is unsafe to answer every question with a quick post. Topics such as hijab, inheritance, testimony, marriage, divorce, leadership, menstruation, mosque access, work, education, and safety require sources, context, and scholarship. Learning before assumptions protects both truth and people.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which topic have you mostly learned through arguments rather than structured study: hijab, marriage, rights, work, education, divorce, inheritance, or menstruation?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a four-column note for one topic: source text, scholarly explanation, cultural practice, and personal question. Keep them separate before forming a conclusion.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support serious learning and capacity. Do not use this chapter as a verdict on complex fiqh or lived trauma.",
      },
    ],
    reflectionQuestions: [
      "Which topic needs source-based study instead of online reaction?",
      "Where might culture and revelation be getting mixed in your mind?",
    ],
    actionSteps: [
      "Choose one topic and split source, scholarship, culture, and questions.",
      "Find one qualified explanation rather than multiple clips.",
      "Avoid forwarding claims you cannot source.",
    ],
    quiz: [
      {
        question:
          "Why separate source, scholarship, culture, and personal questions?",
        options: [
          "To avoid confusing revelation with misuse, custom, or incomplete information",
          "To make every issue simple instantly",
          "To ignore sincere questions",
        ],
        correctAnswer:
          "To avoid confusing revelation with misuse, custom, or incomplete information",
        explanation:
          "Careful separation helps users learn responsibly and prevents harmful overclaims.",
      },
    ],
    audioScript:
      "Do not let arguments be your teacher. Separate source, scholarship, culture, and the question you still need to ask.",
  },
  "women-in-islam-a-careful-introduction-ch-3": {
    subtitle: "Handle common questions without pretending they are small",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Common questions are not always easy questions. A user may ask about hijab, marriage rights, divorce, polygyny, inheritance, testimony, prayer during menstruation, mosque space, domestic harm, education, work, or leadership because the topic touches real life. A responsible app should not rush to a slogan, and it should not shame the questioner for asking. The safer approach is to acknowledge the question, state what is known from verified sources, identify what needs fiqh detail or context, and point to qualified scholarship. The app should also distinguish between Islamic teachings and people's failures. Misuse by a family, spouse, community, or government is not automatically proof of what Islam teaches.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which common question feels emotionally heavy for you, and what would make the answer safer: sources, context, a scholar, lived support, or protection from harm?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Take one common question and write it respectfully with context. Add whether it is theological, legal, personal, safety-related, or historical before looking for an answer.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards for dignity and learning. Complex questions should be routed to qualified Islamic scholarship, and harm/safety cases should include real support.",
      },
    ],
    reflectionQuestions: [
      "Which question should be answered with more care than a quick app response?",
      "How can you separate Islamic teaching from people's misuse of it?",
    ],
    actionSteps: [
      "Write one heavy question with context and category.",
      "Mark whether the question needs scholarship, counselling, legal help, or safety support.",
      "Avoid using a personal story as the only proof for a broad claim.",
    ],
    quiz: [
      {
        question: "How should common questions be handled?",
        options: [
          "With respect, sources, context, and qualified help when needed",
          "With slogans and shame",
          "By pretending difficult topics do not exist",
        ],
        correctAnswer:
          "With respect, sources, context, and qualified help when needed",
        explanation:
          "Common questions can touch real pain and complex rulings, so they require care and proper routing.",
      },
    ],
    audioScript:
      "A common question can still be a serious question. Treat it with sources, context, and mercy.",
  },
  "women-in-islam-a-careful-introduction-ch-4": {
    subtitle: "Know when a careful answer needs a qualified scholar",
    estimatedMinutes: 9,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Some questions should not be answered casually by an app, a friend, or a comment section. Menstruation and worship, divorce, custody, inheritance, abuse, marital obligations, medical decisions, conversion family pressure, workplace discrimination, and safety planning can all require detailed facts and qualified help. The user should be encouraged to ask with dignity and enough context: age if relevant, marital status if relevant, dates, school followed, local law, harm risk, medical facts, previous advice, and what decision is urgent. A careful product does not hide behind 'ask a scholar' as a dead end. It helps the user prepare the question and seek the right kind of support.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Is your question mainly about learning, a ruling, safety, medical care, legal rights, family conflict, or emotional support?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Prepare a scholar-ready question: topic, facts, dates, urgency, who is affected, safety concerns, and what answer you need. If there is danger, seek immediate local help first.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support dignity and knowledge-seeking. They are not a replacement for qualified rulings, safeguarding, medical care, or legal advice.",
      },
    ],
    reflectionQuestions: [
      "What facts would a qualified person need before answering well?",
      "Does this question involve safety or harm that needs urgent support?",
    ],
    actionSteps: [
      "Draft one scholar-ready question with relevant facts.",
      "Choose the right support route: scholar, doctor, counsellor, legal adviser, trusted family, or emergency help.",
      "Do not delay urgent safety action while waiting for an app answer.",
    ],
    quiz: [
      {
        question: "When should a question be escalated beyond app guidance?",
        options: [
          "When rulings, safety, medical, legal, or personal harm details matter",
          "Never, because every answer should be instant",
          "Only when the question is easy",
        ],
        correctAnswer:
          "When rulings, safety, medical, legal, or personal harm details matter",
        explanation:
          "High-care questions need facts, qualified people, and sometimes urgent real-world support.",
      },
    ],
    audioScript:
      "A careful answer sometimes begins with asking the right person. Prepare the facts, protect safety, and seek qualified help.",
  },
  "a-muslim-student-s-path-ch-1": {
    subtitle: "Treat study as a trust, not just a pressure machine",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A Muslim student does not study only for grades, status, family approval, or fear of falling behind. Study can become an amanah when the intention is cleaner: to use time well, develop useful skills, serve people, support lawful work, and become a more capable servant of Allah. That does not remove pressure, deadlines, or exams, but it gives them a healthier place. A student should ask: am I using the time Allah gave me, am I being honest with assignments, am I avoiding cheating, am I protecting prayer, and am I learning in a way that benefits more than my ego? This turns study from panic into responsibility.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What currently drives your study most: worship, service, fear, comparison, pressure from family, career ambition, or wanting to prove yourself?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one study intention for the week. Keep it practical: I want to use my time honestly, protect prayer, and learn something useful for halal service.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on time, intention, and small regular deeds. This chapter gives study coaching, not mental-health or academic policy advice.",
      },
    ],
    reflectionQuestions: [
      "What would make your study more sincere this week?",
      "Where are grades or comparison pulling your intention off balance?",
    ],
    actionSteps: [
      "Write a one-sentence study intention.",
      "Choose one honest work block before your next deadline.",
      "Remove one cheating or shortcut temptation from your study setup.",
    ],
    quiz: [
      {
        question: "How can study become an amanah?",
        options: [
          "By using time honestly for useful learning and Allah-conscious goals",
          "By chasing status at any cost",
          "By ignoring prayer until exams end",
        ],
        correctAnswer:
          "By using time honestly for useful learning and Allah-conscious goals",
        explanation:
          "Study becomes more meaningful when intention, honesty, time, and service are protected.",
      },
    ],
    audioScript:
      "Study is not only pressure. Make it an amanah: honest time, useful learning, protected prayer, and a cleaner intention.",
  },
  "a-muslim-student-s-path-ch-2": {
    subtitle: "Build a timetable where salah is not treated as an interruption",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Classes, lectures, revision, commute, labs, sports, placements, and social plans can make salah feel squeezed. A Muslim student needs a timetable that treats prayer as a fixed anchor, not an optional gap. This may mean checking prayer times before the day begins, finding prayer spaces on campus, carrying what is needed for wudu, planning around exams, and speaking respectfully with staff where accommodations are needed. Some days will be messy. The point is not perfection as a performance. The point is to stop treating prayer as the first thing sacrificed when school becomes busy.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which prayer is most likely to be squeezed by school, commute, sleep, social pressure, or embarrassment?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make a school-day salah map: prayer times, likely location, wudu option, backup place, and the one friend or staff member who can help if needed.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards remind you that time and consistent deeds matter. Ask qualified teachers about missed prayers, travel, illness, or exam-specific situations.",
      },
    ],
    reflectionQuestions: [
      "What practical barrier most often delays prayer during study days?",
      "What backup plan would make salah easier to protect?",
    ],
    actionSteps: [
      "Map tomorrow's prayer times around your classes.",
      "Find or confirm one prayer space.",
      "Prepare what you need for wudu and prayer before leaving home.",
    ],
    quiz: [
      {
        question: "What is the best way to protect salah as a student?",
        options: [
          "Plan prayer into the timetable before the day becomes crowded",
          "Wait until every school task is finished",
          "Only pray when friends make it easy",
        ],
        correctAnswer:
          "Plan prayer into the timetable before the day becomes crowded",
        explanation:
          "Prayer is easier to protect when times, places, and backups are planned in advance.",
      },
    ],
    audioScript:
      "Do not let salah become the leftover. Build your school day around the prayer anchors before the pressure starts.",
  },
  "a-muslim-student-s-path-ch-3": {
    subtitle: "Choose friends who make obedience easier, not smaller",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Friends shape what feels normal. A student may still know what is right, but the group can make prayer embarrassing, gossip entertaining, cheating acceptable, disrespect funny, or haram relationships feel inevitable. Good company does not mean perfect friends who never struggle. It means people who make returning to Allah easier, who respect boundaries, who do not mock worship, and who can be corrected without turning everything into drama. A Muslim student should also be a good influence, not only search for one. That means warmth without compromise, loyalty without hiding harm, and courage to step back when a friendship keeps pulling the heart away from Allah.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "After spending time with your closest friends, do you find prayer, speech, modesty, honesty, and focus easier or harder?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Rate your closest study/social circle honestly: helps deen, neutral, or pulls away. Choose one boundary or one better friendship step this week.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on time and intention to review influence. Serious bullying, exploitation, abuse, or safeguarding concerns need adult/professional support.",
      },
    ],
    reflectionQuestions: [
      "Which friendship makes obedience feel lighter?",
      "Which setting pulls you into speech or behaviour you regret?",
    ],
    actionSteps: [
      "Choose one friend to encourage toward a good action.",
      "Set one boundary around gossip, cheating, or harmful behaviour.",
      "Spend more time with one person who respects your deen.",
    ],
    quiz: [
      {
        question: "What is a healthy friendship sign for a Muslim student?",
        options: [
          "The friendship makes obedience and good character easier",
          "The friendship mocks prayer and boundaries",
          "The friendship requires hiding harm",
        ],
        correctAnswer:
          "The friendship makes obedience and good character easier",
        explanation:
          "Good company supports worship, honesty, boundaries, and returning to Allah after mistakes.",
      },
    ],
    audioScript:
      "Friends shape what feels normal. Choose people who make prayer, honesty, and good character easier to return to.",
  },
  "a-muslim-student-s-path-ch-4": {
    subtitle: "Prepare well, then hand the result back to Allah",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Exams test more than memory. They test sleep, honesty, anxiety, time, dua, family pressure, and trust in Allah. Tawakkul does not mean revising badly and hoping for a miracle, and it does not mean revising obsessively as if the result controls your worth. The student path is to prepare with lawful means: a revision plan, past papers or practice, help from teachers, rest, prayer, and no cheating. Then the result is returned to Allah. If anxiety becomes overwhelming, seek support from family, school, counsellors, or health professionals. Trust in Allah should make effort cleaner, not make suffering invisible.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What does exam pressure usually attack first for you: sleep, prayer, honesty, mood, family relationships, food, focus, or trust in Allah?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make a three-part exam plan: one revision block, one salah/rest anchor, and one support step if anxiety gets too heavy.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect time, intention, and steady deeds. This chapter is not a substitute for academic, counselling, or medical support.",
      },
    ],
    reflectionQuestions: [
      "What effort is genuinely in your control before the exam?",
      "What outcome do you need to hand back to Allah after preparing?",
    ],
    actionSteps: [
      "Schedule one focused revision block.",
      "Protect one prayer and one rest period during exam prep.",
      "Name one person or service to contact if anxiety becomes too heavy.",
    ],
    quiz: [
      {
        question: "What does tawakkul look like around exams?",
        options: [
          "Prepare lawfully, avoid cheating, seek help, and trust Allah with the result",
          "Do no revision and call it trust",
          "Panic as if grades decide your worth before Allah",
        ],
        correctAnswer:
          "Prepare lawfully, avoid cheating, seek help, and trust Allah with the result",
        explanation:
          "Tawakkul joins responsible effort with reliance on Allah and support where needed.",
      },
    ],
    audioScript:
      "Revise honestly, protect prayer, rest enough to think, ask for help, and return the result to Allah.",
  },
  "quitting-bad-habits-ch-1": {
    subtitle: "Map the cue, craving, action, and aftermath without shame",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A bad habit is rarely only a single weak moment. It often has a loop: a cue, a feeling, a story the mind tells, an action, and an aftermath. A Muslim should name that loop without turning the self into the sin. Shame can make the habit feel hidden and permanent, while honest tracking makes it workable. The source anchors on repentance and capacity matter here: Allah's mercy is real, and responsibility is still real. This chapter is not a replacement for therapy, addiction support, safeguarding, or medical care. It is a first map for patterns such as scrolling, anger, lust, gossip, procrastination, spending, or neglected prayer.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Choose one habit. What usually comes before it: boredom, stress, loneliness, tiredness, a device, a place, a person, a time of night, or a feeling of failure?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one habit loop in five parts: cue, feeling, thought, action, aftermath. Do not exaggerate or excuse it. Just make the pattern visible.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to hold mercy and responsibility together. Serious addiction, self-harm, abuse, or compulsive behaviour needs real-world support.",
      },
    ],
    reflectionQuestions: [
      "What cue most often starts the habit loop?",
      "What feeling are you trying to escape when the habit appears?",
    ],
    actionSteps: [
      "Map one habit loop honestly.",
      "Name the cue without calling yourself hopeless.",
      "Choose one support route if the habit feels compulsive or unsafe.",
    ],
    quiz: [
      {
        question: "Why name the habit loop?",
        options: [
          "To make the pattern visible enough to interrupt",
          "To prove change is impossible",
          "To excuse the action completely",
        ],
        correctAnswer: "To make the pattern visible enough to interrupt",
        explanation:
          "A visible loop can be interrupted with tawbah, planning, support, and better replacement actions.",
      },
    ],
    audioScript:
      "Name the loop without naming yourself as hopeless. A pattern seen clearly is easier to bring back to Allah.",
  },
  "quitting-bad-habits-ch-2": {
    subtitle: "Add friction before the weak moment arrives",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Removing the trigger is not cowardice. It is wisdom. Many people rely on willpower at the exact moment when willpower is lowest: late at night, alone with a phone, after an argument, after failing, around certain friends, or when tired and hungry. A Muslim who wants change should design friction before the test arrives. Move the app, block the site, change the route, keep the door open, avoid the private chat, sleep earlier, prepare food, ask for accountability, or leave the setting. Tawbah should lead to practical barriers. If a trigger involves danger, coercion, abuse, or addiction, the barrier may need professional or safeguarding help.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where are you expecting yourself to be strong while leaving the easiest door to the habit wide open?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one trigger and add one barrier today. Make it physical or practical, not only a vague promise to try harder.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support repentance, capacity, and intention. Barriers are means; the heart still asks Allah for help.",
      },
    ],
    reflectionQuestions: [
      "Which trigger can you make harder to reach today?",
      "Who can help you protect the barrier without humiliating you?",
    ],
    actionSteps: [
      "Add one practical barrier before the next weak moment.",
      "Tell one trusted person if accountability is safe and helpful.",
      "Remove one private pathway that repeatedly leads to the habit.",
    ],
    quiz: [
      {
        question: "What does trigger removal show?",
        options: [
          "Wisdom in taking means before weakness arrives",
          "A lack of tawakkul",
          "That repentance is unnecessary",
        ],
        correctAnswer: "Wisdom in taking means before weakness arrives",
        explanation:
          "A believer asks Allah for help and also changes the environment that keeps feeding the habit.",
      },
    ],
    audioScript:
      "Do not wait for the weakest moment to become strong. Add friction before the door opens.",
  },
  "quitting-bad-habits-ch-3": {
    subtitle: "Replace the reward with something lawful, real, and repeatable",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A habit usually gives some reward, even if the reward is shallow or harmful: relief, stimulation, control, escape, attention, numbness, or belonging. Removing the action without replacing the reward leaves a vacuum. A Muslim replacement should be lawful, realistic, and quick enough to use under pressure. For stress, it might be wudu, a walk, breathing, a call, journaling, or two rak'ahs if able. For boredom, it might be a clean hobby, study sprint, exercise, or service. For loneliness, it might be a safe friend or community step. The replacement does not need to feel perfect at first. It needs to be available before the old loop wins.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What reward does the bad habit give you: relief, escape, excitement, validation, control, comfort, or a break from difficult feelings?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one replacement menu with three options: one spiritual, one physical, and one social or practical. Keep each option small enough to do in five minutes.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to keep the replacement tied to mercy and responsibility. Mental-health struggles should also get suitable human support.",
      },
    ],
    reflectionQuestions: [
      "What reward are you actually seeking from the habit?",
      "Which lawful replacement could meet that need without feeding harm?",
    ],
    actionSteps: [
      "Create a three-option replacement menu.",
      "Put the menu somewhere visible before the trigger time.",
      "Use one replacement once, even if the craving does not fully disappear.",
    ],
    quiz: [
      {
        question: "Why does replacement matter?",
        options: [
          "Because removing a habit often leaves a need that should be met lawfully",
          "Because the old habit should stay available",
          "Because cravings vanish by being ignored forever",
        ],
        correctAnswer:
          "Because removing a habit often leaves a need that should be met lawfully",
        explanation:
          "A lawful replacement helps the user act before the old loop regains control.",
      },
    ],
    audioScript:
      "Find the reward the habit was chasing, then meet that need with something cleaner, smaller, and ready.",
  },
  "quitting-bad-habits-ch-4": {
    subtitle: "Return fast after slips so one fall does not become a season",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A slip is dangerous when it becomes a story: I failed, so I may as well continue; Allah will not accept me; I always ruin everything. That story can turn one fall into a week, a month, or a hidden identity. Islam gives a better path: stop, repent, repair what can be repaired, learn what happened, and restart the next prayer or next clean action. Returning fast does not minimise the sin. It refuses to let the sin become a home. If the slip involved another person's rights, harm, money, explicit material, abuse, or illegal behaviour, returning also means seeking qualified help and making repair where possible.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "After a slip, what story do you usually tell yourself, and does that story bring you back to Allah or push you further away?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a slip plan: stop, make tawbah, pray the next prayer, repair rights if needed, write the trigger, and restart one clean action within the same day.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor repentance and capacity. Personal harms, addictions, and rights violations need more than private reflection.",
      },
    ],
    reflectionQuestions: [
      "What restart action can you do on the same day as a slip?",
      "Which rights or harms would require repair beyond private tawbah?",
    ],
    actionSteps: [
      "Write a six-step slip plan.",
      "Choose the next prayer as a non-negotiable return point.",
      "Ask for help if the pattern keeps returning or harms others.",
    ],
    quiz: [
      {
        question: "What should happen after a slip?",
        options: [
          "Return quickly with tawbah, repair, learning, and one clean action",
          "Continue because the day is already lost",
          "Hide forever and stop asking Allah",
        ],
        correctAnswer:
          "Return quickly with tawbah, repair, learning, and one clean action",
        explanation:
          "Fast return protects hope while keeping responsibility for repair and future barriers.",
      },
    ],
    audioScript:
      "Do not let one fall become a season. Stop, repent, repair, learn, and return to the next clean action.",
  },
  "daily-dhikr-reset-ch-1": {
    subtitle: "Remember Allah before the phone trains the morning",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The first minutes of the day often teach the heart what matters. If the morning begins with noise, comparison, messages, and urgency, the heart can feel scattered before it has remembered Allah. A daily dhikr reset begins small: wake, breathe, remember Allah, and delay the first unnecessary scroll long enough to choose your direction. Dhikr is not a productivity trick. It is worship and remembrance. The source cards should keep the user from turning it into a performance metric. The aim is a heart that starts the day with Allah before the world starts assigning fear, envy, and hurry.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What usually reaches your heart first in the morning: Allah's remembrance, notifications, worry, comparison, work, or family pressure?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose a first-minute dhikr: one phrase, one dua, or one quiet moment before touching your phone for anything non-urgent.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on remembrance and small regular deeds. For exact morning/evening adhkar texts, use verified collections and teacher-reviewed resources.",
      },
    ],
    reflectionQuestions: [
      "What noise do you need to delay for one minute after waking?",
      "Which short remembrance can you keep without making it complicated?",
    ],
    actionSteps: [
      "Pick one first-minute dhikr.",
      "Move your phone far enough to create a pause.",
      "Repeat the practice for three mornings before adding more.",
    ],
    quiz: [
      {
        question: "What is the first aim of a dhikr reset?",
        options: [
          "Let remembrance reach the heart before avoidable noise",
          "Collect complicated routines immediately",
          "Use dhikr only as a productivity trick",
        ],
        correctAnswer: "Let remembrance reach the heart before avoidable noise",
        explanation:
          "A small morning remembrance can orient the heart before the day becomes crowded.",
      },
    ],
    audioScript:
      "Before the noise arrives, remember Allah. One sincere minute can change the direction of the morning.",
  },
  "daily-dhikr-reset-ch-2": {
    subtitle: "Anchor the edges of the day without overloading the heart",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Morning and evening adhkar can protect the edges of the day, but many users fail because they start with a routine too large to carry. Begin with a verified set, a reliable text, and a time anchor that already exists: after Fajr, commute, after Maghrib, before dinner, or before the evening phone spiral. The user should not invent wording and attribute it to the Sunnah. Keep exact prophetic adhkar exact, and keep personal duas labelled as personal duas. This distinction protects source trust. A small verified routine done consistently is better than an impressive list that disappears after two days.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which edge of your day is weaker: the morning start or the evening landing?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one verified morning/evening adhkar source and one time anchor. Start with a short portion you can repeat for seven days.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support remembrance and consistency. Exact adhkar wording should come from verified sources, not memory or unattributed graphics.",
      },
    ],
    reflectionQuestions: [
      "What time anchor can carry your morning or evening adhkar?",
      "How will you distinguish prophetic adhkar from personal dua?",
    ],
    actionSteps: [
      "Pick one verified adhkar source.",
      "Attach it to one existing time anchor.",
      "Keep it small for seven days before expanding.",
    ],
    quiz: [
      {
        question: "What protects source trust in adhkar?",
        options: [
          "Keeping exact prophetic wording sourced and personal duas clearly labelled",
          "Attributing every nice phrase to the Sunnah",
          "Changing wording without checking",
        ],
        correctAnswer:
          "Keeping exact prophetic wording sourced and personal duas clearly labelled",
        explanation:
          "Adhkar routines should be consistent and source-careful, especially when wording is attributed to the Prophet ﷺ.",
      },
    ],
    audioScript:
      "Anchor the morning or evening with a small verified routine. Keep prophetic wording sourced and personal dua honest.",
  },
  "daily-dhikr-reset-ch-3": {
    subtitle: "Use remembrance as a return point when pressure rises",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Dhikr under pressure is not pretending the pressure is imaginary. It is returning the heart to Allah while dealing with the real situation. Stress, anger, embarrassment, temptation, grief, or panic can narrow the mind until only the trigger feels real. A short remembrance phrase creates a pause: Allah sees me, Allah can help me, this moment is not bigger than Him. The user still takes practical steps: breathe, leave a harmful setting, ask for support, apologise, study, rest, or seek urgent help. Dhikr is worship and a return point, not a denial of medical, emotional, or safety needs.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which pressure moment most needs a return point: anger, anxiety, temptation, shame, sadness, family conflict, or work stress?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one pressure phrase, such as astaghfirullah, hasbi Allah, la hawla wa la quwwata illa billah, or a simple personal dua for help. Pair it with one practical next step.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to connect remembrance with steadiness. For exact virtues of specific phrases, use verified hadith references and teacher-reviewed material.",
      },
    ],
    reflectionQuestions: [
      "Which pressure moment needs a phrase and a practical step?",
      "What help do you need if dhikr alone is not enough for the situation?",
    ],
    actionSteps: [
      "Pick one pressure phrase.",
      "Pair it with one physical action, such as pause, leave, breathe, or call support.",
      "Use it once during a mild pressure moment before a major one arrives.",
    ],
    quiz: [
      {
        question: "What is dhikr under pressure?",
        options: [
          "A return to Allah joined with practical action",
          "A way to deny real problems",
          "A replacement for urgent help in danger",
        ],
        correctAnswer: "A return to Allah joined with practical action",
        explanation:
          "Remembrance can steady the heart while the user still takes responsible practical steps.",
      },
    ],
    audioScript:
      "When pressure narrows the world, remember Allah and take the next responsible step.",
  },
  "daily-dhikr-reset-ch-4": {
    subtitle: "Build a personal wird that is sourced, small, and reviewable",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A personal wird is a regular portion of remembrance, Quran, salawat, dua, or reflection that helps the heart return to Allah. It should be sourced where it uses prophetic wording, honest where it uses personal dua, and small enough to survive ordinary life. Do not build the routine to impress people. Build it to be kept. A strong start might be one Quran portion, one verified dhikr, one salawat habit, and one personal dua list. Review it weekly: did it bring humility, steadiness, and obedience, or did it become another scoreboard? The aim is remembrance that softens the heart and strengthens worship.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What would be a realistic daily wird for your current life, not an imaginary perfect version of you?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Design a seven-day wird with three small parts: Quran, verified dhikr or salawat, and personal dua. Review it gently after one week.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards for remembrance and consistency. Keep exact attributed wording verified and avoid claiming guaranteed outcomes without evidence.",
      },
    ],
    reflectionQuestions: [
      "Which small wird could you keep for seven days?",
      "How will you stop the routine becoming a scoreboard for pride?",
    ],
    actionSteps: [
      "Choose one Quran portion, one dhikr/salawat, and one dua list.",
      "Keep the wird small for seven days.",
      "Review whether it improved remembrance and obedience.",
    ],
    quiz: [
      {
        question: "What makes a personal wird healthy?",
        options: [
          "It is sourced, small, sincere, and reviewable",
          "It is designed mainly to impress people",
          "It claims guaranteed outcomes without proof",
        ],
        correctAnswer: "It is sourced, small, sincere, and reviewable",
        explanation:
          "A healthy wird supports remembrance and obedience without overclaiming or becoming a prideful scoreboard.",
      },
    ],
    audioScript:
      "Build a small wird you can keep: Quran, verified remembrance, salawat, and personal dua with sincerity.",
  },
  "controlling-anger-ch-1": {
    subtitle: "Notice the body before the tongue takes control",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Anger usually enters the body before it exits the tongue. Heat, tight chest, fast speech, clenched jaw, restless hands, sarcasm, or the urge to send one more message can all be early warnings. A Muslim who wants to control anger should learn those signs before the damage happens. The Quranic and hadith source anchors connect strength with restraint, not domination. Not every anger is sinful; anger at injustice can point to something that needs repair. But uncontrolled anger can become harm. If anger involves violence, threats, intimidation, self-harm, abuse, or fear in the home, this is not only a self-control lesson. Get real help and protect safety.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What are your earliest anger signs: heat, volume, silence, sarcasm, pacing, typing, blaming, or wanting to punish?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write your three earliest anger signs. Share them with yourself as a warning system, not as an excuse.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on restraint and prophetic self-control. Safety, abuse, or violence must be handled with qualified support.",
      },
    ],
    reflectionQuestions: [
      "Which body sign tells you anger is rising?",
      "When does your anger move from signal to harm?",
    ],
    actionSteps: [
      "List three early anger signs.",
      "Choose one pause action for each sign.",
      "Seek help if anger creates fear or danger for anyone.",
    ],
    quiz: [
      {
        question: "Why notice anger early?",
        options: [
          "To interrupt harm before the tongue or body acts",
          "To justify whatever happens next",
          "To prove anger is always forbidden",
        ],
        correctAnswer: "To interrupt harm before the tongue or body acts",
        explanation:
          "Early signs help the user pause before anger turns into damaging speech or action.",
      },
    ],
    audioScript:
      "Notice the heat before the words arrive. Early awareness gives restraint a place to begin.",
  },
  "controlling-anger-ch-2": {
    subtitle: "Delay the sentence you will regret",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The tongue often turns a solvable problem into a wound. Anger wants speed: send it, say it, expose it, win now. Restraint creates space before the sentence becomes damage. A user can build a pause plan: stop typing, lower the voice, sit down, make wudu if helpful, leave the room safely, ask for ten minutes, or write the message without sending it. The aim is not to suppress truth forever. It is to stop the first wave from choosing the words. If the other person is unsafe, the pause may mean leaving and getting support, not staying to manage someone else's rage.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which sentence do you tend to say when angry that later needs repair: exaggeration, insult, threat, accusation, sarcasm, or public exposure?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a pause phrase: I need ten minutes, I want to answer without hurting you, or I will reply after I calm down. Use it before the next difficult reply.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect strength with restraint. Use the pause to choose better speech, not to avoid necessary justice or safety.",
      },
    ],
    reflectionQuestions: [
      "What kind of angry sentence causes the most repair work later?",
      "Which pause phrase could you actually say under pressure?",
    ],
    actionSteps: [
      "Write one pause phrase.",
      "Do not send one angry message for ten minutes.",
      "Return to the issue with clearer words or seek help if unsafe.",
    ],
    quiz: [
      {
        question: "What does pausing the tongue do?",
        options: [
          "It gives truth a chance to be spoken without unnecessary harm",
          "It means the issue never matters",
          "It guarantees the other person is wrong",
        ],
        correctAnswer:
          "It gives truth a chance to be spoken without unnecessary harm",
        explanation:
          "A pause can prevent regret while still allowing necessary conversations and boundaries.",
      },
    ],
    audioScript:
      "Delay the sentence anger wants most. Ten quiet minutes can save a relationship from a needless wound.",
  },
  "controlling-anger-ch-3": {
    subtitle: "Repair before pride makes the wound permanent",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Anger sometimes wins a moment. When it does, repair should begin quickly. A real apology is not a performance and not a demand for instant forgiveness. It names the harm without excuses, takes responsibility, asks what repair is needed, and changes the pattern. If property was damaged, money was taken, a reputation was harmed, or someone was frightened, repair may require more than words. If anger is repeated and harmful, accountability and outside help matter. Tawbah to Allah and repair with people belong together when people's rights were violated. The user should also review what made the anger possible so the same harm is not simply repeated with a nicer apology.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "When you apologise, do you name the harm clearly, or do you hide behind phrases like mistakes were made or I was just stressed?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one clean repair sentence: I said or did this, it harmed you in this way, I am sorry, and this is what I will change.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on anger and restraint. Rights, safety, and repeated harm need real accountability and qualified help.",
      },
    ],
    reflectionQuestions: [
      "What repair is owed beyond saying sorry?",
      "Which pattern needs accountability, not another vague apology?",
    ],
    actionSteps: [
      "Write one specific apology if you owe one.",
      "Name one behaviour you will change.",
      "Seek outside support if anger repeatedly causes harm.",
    ],
    quiz: [
      {
        question: "What makes repair real after anger?",
        options: [
          "Naming harm, taking responsibility, repairing rights, and changing the pattern",
          "Demanding instant forgiveness",
          "Pretending stress excuses everything",
        ],
        correctAnswer:
          "Naming harm, taking responsibility, repairing rights, and changing the pattern",
        explanation:
          "Repair needs honesty with Allah and with people whose rights or dignity were harmed.",
      },
    ],
    audioScript:
      "When anger wins, repair quickly. Name the harm, apologise clearly, restore rights, and change the pattern.",
  },
  "controlling-anger-ch-4": {
    subtitle: "Design a calmer environment before the next fire starts",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Anger control is not only a moment-by-moment fight. It is also environment design. Sleep, hunger, caffeine, constant notifications, unresolved resentment, financial pressure, clutter, online arguments, and certain group chats can all lower restraint. A cooler environment does not remove accountability, but it gives the heart and body a better chance. Build patterns that reduce unnecessary heat: earlier sleep, fewer late-night debates, agreed family pause rules, device limits, meal planning, exercise, counselling, or scheduled problem-solving. For dangerous anger, environment design includes safety plans and professional support. For normal stress, it means removing sparks before they become fires.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which environmental factor makes your anger worse: sleep, hunger, noise, phone use, money stress, unresolved conflict, or online arguments?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one environmental change for the next seven days: sleep boundary, food plan, notification limit, calmer conversation time, or leaving one heated online space.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support restraint and anger control. Environmental changes help but do not replace accountability, safety, or professional support where needed.",
      },
    ],
    reflectionQuestions: [
      "What spark can you remove before anger rises?",
      "Which recurring argument needs a calmer time and clearer rule?",
    ],
    actionSteps: [
      "Choose one seven-day environment change.",
      "Agree one pause rule with family or colleagues if appropriate.",
      "Leave one online space that repeatedly inflames you.",
    ],
    quiz: [
      {
        question: "Why build a cooler environment?",
        options: [
          "To reduce avoidable sparks and support restraint",
          "To remove personal responsibility",
          "To keep anger hidden without repair",
        ],
        correctAnswer: "To reduce avoidable sparks and support restraint",
        explanation:
          "A calmer environment helps restraint, while accountability and repair still remain necessary.",
      },
    ],
    audioScript:
      "Do not only fight the fire. Remove the sparks: sleep, noise, hunger, phone pressure, and arguments that can be handled better.",
  },
  "children-s-iman-builder-ch-1": {
    subtitle: "Teach faith through warmth before lectures become noise",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Children often learn the feeling of religion before they understand the language of religion. Warmth does not mean weak boundaries, and it does not mean avoiding serious teaching. It means the home atmosphere makes Allah's remembrance feel safe, loved, and connected to mercy rather than only correction. A parent or carer should ask: does my child hear Allah's name mostly when they are in trouble, or also when we are grateful, amazed, comforted, and hopeful? This chapter does not replace parenting support or safeguarding advice. It gives a faith-building posture: gentleness, consistency, truthful answers, and age-appropriate practice.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "When your child hears Islamic reminders from you, do they mostly feel warmth, fear, pressure, curiosity, annoyance, love, or confusion?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one warm iman moment today: thank Allah aloud for a blessing, answer one question gently, or connect a good action to Allah's love without a lecture.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on family responsibility and Luqman's teaching as anchors. Serious behaviour, trauma, or safeguarding concerns need qualified help.",
      },
    ],
    reflectionQuestions: [
      "What feeling does your home attach to Allah's remembrance?",
      "Where can you add warmth without losing boundaries?",
    ],
    actionSteps: [
      "Create one warm iman moment today.",
      "Use one short sentence instead of a long lecture.",
      "Notice how the child responds before adding more teaching.",
    ],
    quiz: [
      {
        question: "What should warmth do in faith teaching?",
        options: [
          "Make worship feel safe, loved, and connected to mercy",
          "Remove all boundaries and correction",
          "Turn every moment into a long lecture",
        ],
        correctAnswer: "Make worship feel safe, loved, and connected to mercy",
        explanation:
          "Warmth helps children receive faith as mercy and guidance while boundaries and truthful teaching remain.",
      },
    ],
    audioScript:
      "Let the child meet Islam through warmth, honesty, and small remembered moments before the lecture becomes noise.",
  },
  "children-s-iman-builder-ch-2": {
    subtitle: "Connect goodness to Allah without turning reward into pressure",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Children need to hear that Allah loves goodness, truthfulness, prayer, kindness, patience, and care for people. But they also need this teaching to be gentle enough for their age and secure enough not to make them feel Allah's love is impossible to reach. When a child shares, apologises, prays a little, tells the truth, or shows mercy, name the goodness and connect it to Allah. Avoid making every mistake a heavy spiritual crisis. Correction matters, but the child should also learn that returning is possible and that Allah sees small good. This builds hope and responsibility together.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which good action does your child already do that you could connect to Allah's love: sharing, helping, truthfulness, prayer, kindness, patience, or courage?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Praise one specific good action and connect it to Allah in one sentence. Keep the sentence simple enough for the child to repeat.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards for family teaching and capacity. Do not use reward, punishment, or fear in ways that overwhelm a child's stage.",
      },
    ],
    reflectionQuestions: [
      "Which good action should be noticed more in your home?",
      "Where might correction be louder than hope?",
    ],
    actionSteps: [
      "Name one specific good action today.",
      "Connect it to Allah with a short sentence.",
      "Balance one correction with one hopeful reminder.",
    ],
    quiz: [
      {
        question: "How should goodness be taught to children?",
        options: [
          "Specifically, warmly, and in an age-appropriate way",
          "Only through fear",
          "By ignoring small good actions",
        ],
        correctAnswer: "Specifically, warmly, and in an age-appropriate way",
        explanation:
          "Children benefit from concrete examples of goodness connected to Allah with hope and responsibility.",
      },
    ],
    audioScript:
      "Notice small goodness. Say it warmly. Help the child see that Allah sees truth, kindness, prayer, and return.",
  },
  "children-s-iman-builder-ch-3": {
    subtitle: "Make salah familiar before it becomes only a demand",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Children grow into salah more easily when prayer is familiar, visible, and connected to love rather than only last-minute pressure. A small child may watch, bring a prayer mat, learn one phrase, stand beside a parent briefly, or celebrate wudu practice. Older children need structure, encouragement, and gradually clearer expectations. Parents should avoid turning every prayer conversation into anger, comparison, or shame. Salah is serious, but seriousness can be taught with rhythm, example, preparation, and dua. If a child has sensory needs, anxiety, trauma, disability, or family conflict around prayer, adapt with care and seek qualified support where needed.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What does salah feel like in your home: calm, rushed, tense, hidden, joyful, inconsistent, or mostly discussed when someone is late?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create one little salah moment this week: prayer mat helper, one phrase learned, one quiet adhan response, or praying one prayer visibly and calmly.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on family responsibility and teaching with wisdom. Detailed rulings and age-specific duties should be learned from qualified teachers.",
      },
    ],
    reflectionQuestions: [
      "What small prayer habit can become familiar before it becomes required?",
      "Where does your tone around salah need more mercy?",
    ],
    actionSteps: [
      "Choose one child-friendly salah moment.",
      "Model one calm prayer without turning it into a lecture.",
      "Ask a teacher about age-specific expectations if unsure.",
    ],
    quiz: [
      {
        question: "What helps children grow toward salah?",
        options: [
          "Familiarity, example, warmth, structure, and gradual learning",
          "Only shouting when they miss it",
          "Keeping prayer hidden until they are older",
        ],
        correctAnswer:
          "Familiarity, example, warmth, structure, and gradual learning",
        explanation:
          "Salah should become visible and beloved while expectations grow with age, knowledge, and capacity.",
      },
    ],
    audioScript:
      "Let salah become familiar: a mat, a phrase, a calm example, and a home where prayer is seen with love.",
  },
  "children-s-iman-builder-ch-4": {
    subtitle: "Celebrate character without making the child perform piety",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Character should be celebrated because it is beloved to Allah, not because children need to perform piety for adults. When a child tells the truth, shares, apologises, controls anger, helps a sibling, or includes someone lonely, name the character and thank Allah. Avoid turning every good action into content, public praise, or comparison with other children. Private encouragement is often more powerful and safer. Children also need repair after mistakes: what happened, who was hurt, what can be fixed, and what better choice comes next. This builds a heart that connects iman to behaviour, not only to information.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which character quality do you want to see more in your child, and how can you model it before demanding it?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one character quality for the week: truth, mercy, patience, sharing, apology, or service. Notice it privately and model it once yourself.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to keep character tied to worship and family responsibility. Avoid public exposure or comparison that harms trust.",
      },
    ],
    reflectionQuestions: [
      "What character quality should be modelled more than lectured?",
      "Where could public praise or comparison damage sincerity?",
    ],
    actionSteps: [
      "Pick one character focus for the week.",
      "Privately notice one good example.",
      "Model the same quality in front of the child.",
    ],
    quiz: [
      {
        question: "How should children's character be encouraged?",
        options: [
          "Privately, specifically, and connected to Allah without performance pressure",
          "Only through public comparison",
          "By ignoring repair after mistakes",
        ],
        correctAnswer:
          "Privately, specifically, and connected to Allah without performance pressure",
        explanation:
          "Character grows through modelling, private encouragement, repair, and sincerity.",
      },
    ],
    audioScript:
      "Celebrate character quietly. Let the child feel seen by Allah before they feel watched by people.",
  },
  "brotherhood-and-sisterhood-ch-1": {
    subtitle: "Choose company that helps your deen breathe",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Good company is not a perfect group with no flaws. It is company where faith can breathe: people who remind you of Allah without pretending, respect your boundaries, protect your dignity, and make sin less normal rather than more entertaining. A Muslim should also ask what kind of company they are for others. Do people leave your presence safer in speech, calmer in heart, and more willing to do good? Choosing company may require stepping back from circles built on gossip, mockery, temptation, or constant drama. It may also require becoming the warm, steady friend you wish existed.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "After spending time with your closest circle, do you usually feel closer to Allah, more distracted, more cynical, more tempted, or more hopeful?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Map three circles: company that helps deen, company that is neutral, and company that repeatedly pulls you into harm. Choose one boundary or one better connection.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on safe speech, backbiting, and prophetic character. Serious manipulation, abuse, or exploitation needs real support.",
      },
    ],
    reflectionQuestions: [
      "Which friendship helps you return to Allah?",
      "Which circle makes harmful behaviour feel normal?",
    ],
    actionSteps: [
      "Map your three friendship circles.",
      "Strengthen one good connection.",
      "Set one boundary with a harmful pattern.",
    ],
    quiz: [
      {
        question: "What is a sign of good company?",
        options: [
          "It makes obedience, safety, and good character easier",
          "It makes sin feel normal",
          "It requires you to hide your deen",
        ],
        correctAnswer: "It makes obedience, safety, and good character easier",
        explanation:
          "Good company helps the heart breathe and makes returning to Allah easier.",
      },
    ],
    audioScript:
      "Choose company where faith can breathe, speech is safer, and goodness feels easier to return to.",
  },
  "brotherhood-and-sisterhood-ch-2": {
    subtitle: "Serve people without turning their need into your image",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Serving quietly is a cure for ego when it is done with sincerity and wisdom. Community service is not only big campaigns. It can be checking on someone, giving a lift, cooking, mentoring, cleaning a space, helping a new Muslim reach a class, or making a private dua. But service has adab: do not expose people's hardship, post their pain for your image, promise what you cannot deliver, or enter safeguarding spaces without the right permission. Quiet service protects dignity. It also reminds the user that brotherhood and sisterhood are not slogans; they are rights, reliability, and mercy.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "When you help people, do you want the person to be supported, or do you also need to be seen as the helper?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one quiet service action this week that protects dignity: a private check-in, a meal, a lift, a useful resource, or a hidden dua.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to connect service with prophetic character and safe conduct. Safeguarding, money, and counselling needs require proper channels.",
      },
    ],
    reflectionQuestions: [
      "What quiet service could you do without needing credit?",
      "Where might your help need better boundaries or permission?",
    ],
    actionSteps: [
      "Choose one quiet service action.",
      "Avoid posting it unless there is a clear benefit.",
      "Check that the help protects privacy and dignity.",
    ],
    quiz: [
      {
        question: "What does quiet service protect?",
        options: [
          "Sincerity, dignity, and trust",
          "The helper's public image above all",
          "Promises that cannot be kept",
        ],
        correctAnswer: "Sincerity, dignity, and trust",
        explanation:
          "Service should benefit people without exposing them or turning their need into someone else's image.",
      },
    ],
    audioScript:
      "Serve quietly. Let dignity stay covered, promises stay realistic, and sincerity stay between you and Allah.",
  },
  "brotherhood-and-sisterhood-ch-3": {
    subtitle: "Make gatherings safer by refusing the easy bite of gossip",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Backbiting often enters a gathering disguised as concern, humour, analysis, or just telling the truth. The Quranic anchor is severe because speech can eat people's dignity while they are absent. Avoiding backbiting does not mean hiding abuse, refusing testimony, or never seeking advice. It means not turning people's faults into entertainment or social currency. A safer gathering has redirection phrases: let us not speak about them like this, have you spoken to them directly, is this needed for advice, or should we make dua instead? Brotherhood and sisterhood need tongues that people can trust when they leave the room.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which setting makes gossip easiest for you: family chats, work breaks, group messages, mosque circles, online comments, or friend hangouts?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Prepare one redirection phrase before the next gathering. Keep it calm enough to use without making a performance of righteousness.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on backbiting and safe speech. Cases involving harm, testimony, or seeking advice need honest purpose and careful limits.",
      },
    ],
    reflectionQuestions: [
      "Where does gossip feel most socially rewarded?",
      "What phrase can redirect without humiliating people?",
    ],
    actionSteps: [
      "Choose one gossip redirection phrase.",
      "Leave or change one conversation that turns harmful.",
      "Make dua for someone you were tempted to discuss.",
    ],
    quiz: [
      {
        question: "What makes speech safer in a gathering?",
        options: [
          "Avoiding entertainment from absent people's faults",
          "Calling gossip concern whenever it feels interesting",
          "Exposing everyone for social reward",
        ],
        correctAnswer: "Avoiding entertainment from absent people's faults",
        explanation:
          "Safe speech protects dignity while still allowing necessary advice, testimony, or harm prevention with limits.",
      },
    ],
    audioScript:
      "Let people be safe when they leave the room. Redirect gossip before it becomes the gathering's food.",
  },
  "brotherhood-and-sisterhood-ch-4": {
    subtitle: "Repair relationships with truth, boundaries, and humility",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Repairing brotherhood or sisterhood does not mean pretending nothing happened. It means asking what truth, apology, restitution, boundaries, and time are needed. Some harms can be repaired with a clear apology and changed behaviour. Some require returning money, correcting a false statement, protecting privacy, involving elders, or stepping back. Some situations are unsafe and should not be forced into reconciliation without protection. The user should not use unity language to silence harm, and should not use hurt as permission for endless revenge. Repair is an act of worship when it restores rights and lowers pride.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Is there a relationship where repair is possible, or is the safer first step a boundary, distance, or trusted mediation?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one repair map: what happened, what right was harmed, what apology or restitution is due, what boundary is needed, and who can mediate if appropriate.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards for safe conduct and prophetic character. Do not force reconciliation in abusive or unsafe situations.",
      },
    ],
    reflectionQuestions: [
      "What right needs repair, not just nicer feelings?",
      "What boundary would make future interaction safer?",
    ],
    actionSteps: [
      "Write a repair map for one relationship.",
      "Return or correct one right if needed.",
      "Seek mediation only when it is safe and appropriate.",
    ],
    quiz: [
      {
        question: "What should repair include when harm happened?",
        options: [
          "Truth, apology, rights, boundaries, and safe mediation if needed",
          "Pretending nothing happened",
          "Forcing unsafe reconciliation",
        ],
        correctAnswer:
          "Truth, apology, rights, boundaries, and safe mediation if needed",
        explanation:
          "Repair should restore rights and dignity while respecting safety and boundaries.",
      },
    ],
    audioScript:
      "Repair with humility, but do not erase truth. Restore rights, set boundaries, and keep safety clear.",
  },
  "the-quiet-power-of-sabr-ch-1": {
    subtitle: "Practise patience that still moves toward what is right",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Sabr is not passivity. It is the steadiness that keeps a believer from disobedience while they take the next right step. Sometimes sabr means waiting without despair. Sometimes it means acting despite pain. Sometimes it means leaving a sin, holding the tongue, keeping prayer, seeking help, or continuing a duty when emotions are heavy. A user should not use sabr to excuse oppression, abuse, medical neglect, or silence in the face of preventable harm. The source cards on patience, capacity, and hope should create a balanced path: endure what must be endured, change what can be changed, and ask Allah for strength.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where do you need active sabr right now: waiting, resisting sin, speaking carefully, seeking help, or continuing a duty?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Name one hardship and one active step. Keep the step small enough to complete today without pretending the pain is gone.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to keep patience joined to prayer, capacity, and hope. Harm and danger need support, not spiritual slogans.",
      },
    ],
    reflectionQuestions: [
      "What does active sabr require from you today?",
      "Where have you confused patience with doing nothing?",
    ],
    actionSteps: [
      "Name one hardship honestly.",
      "Choose one right action within your capacity.",
      "Ask for help where sabr requires support.",
    ],
    quiz: [
      {
        question: "What is active sabr?",
        options: [
          "Steadiness that avoids sin and takes the next right step",
          "Doing nothing in every situation",
          "Hiding harm forever",
        ],
        correctAnswer:
          "Steadiness that avoids sin and takes the next right step",
        explanation:
          "Sabr can include waiting, restraint, action, help-seeking, and continuing obedience within capacity.",
      },
    ],
    audioScript:
      "Sabr is not frozen. It is steady obedience, careful restraint, and the next right step with Allah's help.",
  },
  "the-quiet-power-of-sabr-ch-2": {
    subtitle: "Guard speech when pain wants a shortcut",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Pain often looks for a shortcut through the tongue: complaint without need, blame, accusation, exposing private matters, or words designed to wound. Holding the tongue is not the same as never speaking. A Muslim may need to ask for help, report harm, seek advice, testify, or set boundaries. The discipline is to speak with purpose rather than spill harm. Before speaking, ask: is this true, needed, proportionate, and directed to the right person? Sabr in speech can protect relationships, dignity, and the heart. It also protects the user from adding a new sin to an old pain.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "When you are hurt, what kind of speech comes fastest: complaint, sarcasm, exposure, accusation, silence, or a sincere request for help?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Use a speech filter once today: true, needed, proportionate, and directed to the right person. If it fails, delay the words.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to connect patience with safe speech. Do not use silence to hide abuse, danger, or rights that must be restored.",
      },
    ],
    reflectionQuestions: [
      "What words do you usually regret after pain?",
      "Who is the right person to speak to if help is genuinely needed?",
    ],
    actionSteps: [
      "Apply the four-part speech filter once.",
      "Delay one message written from pain.",
      "Seek help if silence would hide harm.",
    ],
    quiz: [
      {
        question: "What does sabr in speech mean?",
        options: [
          "Speaking with truth, purpose, proportion, and the right audience",
          "Never seeking help",
          "Saying everything pain demands",
        ],
        correctAnswer:
          "Speaking with truth, purpose, proportion, and the right audience",
        explanation:
          "Patient speech is restrained but not passive when help, rights, or safety require speaking.",
      },
    ],
    audioScript:
      "When pain reaches for the tongue, slow it down: true, needed, proportionate, and to the right person.",
  },
  "the-quiet-power-of-sabr-ch-3": {
    subtitle: "Keep prayer as the rope when the day feels heavy",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Hard days can make prayer feel heavy, yet prayer is one of the first ropes a believer needs. Keeping the prayer does not mean the heart feels peaceful every time. Sometimes it means standing before Allah tired, distracted, tearful, or barely holding the day together. That still matters. A user should reduce friction: prepare wudu earlier, choose a clean space, shorten optional extras, ask someone to remind them, or protect the next prayer rather than spiralling over the whole week. If depression, grief, illness, or trauma makes daily functioning difficult, spiritual practice should be joined with human support and qualified care.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which prayer becomes most vulnerable when life is heavy, and what practical barrier makes it harder?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose the next prayer as the return point. Prepare one thing now: wudu, place, reminder, clothing, or a quiet two-minute buffer.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on patience and seeking help through prayer. Medical, grief, or trauma support can sit alongside worship.",
      },
    ],
    reflectionQuestions: [
      "Which prayer needs the strongest protection during hardship?",
      "What support would make prayer easier to keep?",
    ],
    actionSteps: [
      "Prepare for the next prayer now.",
      "Reduce one friction point before prayer time.",
      "Ask for support if hardship is affecting daily functioning.",
    ],
    quiz: [
      {
        question: "What should the next prayer become on a hard day?",
        options: [
          "A return point and rope back to Allah",
          "A reason to despair if focus is imperfect",
          "Something to delay until life is easy",
        ],
        correctAnswer: "A return point and rope back to Allah",
        explanation:
          "Prayer remains a lifeline even when the heart feels tired or distracted.",
      },
    ],
    audioScript:
      "On a heavy day, protect the next prayer. Stand before Allah tired if you must, but do not drop the rope.",
  },
  "the-quiet-power-of-sabr-ch-4": {
    subtitle: "Hold hope while waiting without pretending waiting is easy",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Waiting can test hope quietly: waiting for marriage, healing, work, children, reconciliation, clarity, acceptance, relief, or a dua to unfold. Sabr while waiting does not require pretending the wait is easy. It requires guarding the heart from despair and guarding the limbs from haram shortcuts. The user can build a waiting plan: make dua, take lawful means, serve where possible, keep prayer, reduce comparison, and review what is still in their control. Hope should not become denial, and planning should not become obsession. A believer waits with Allah, not alone with the clock.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What are you waiting for, and what temptation appears when the wait feels too long: despair, envy, anger, haram shortcuts, or giving up effort?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a waiting plan with three columns: dua, lawful means, and what to stop checking or comparing for the next week.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards on patience, capacity, and hope. If waiting includes serious harm or urgent need, seek appropriate help rather than only enduring.",
      },
    ],
    reflectionQuestions: [
      "What does hope need to look like while you wait?",
      "Which comparison or shortcut is making the wait harder?",
    ],
    actionSteps: [
      "Write a three-column waiting plan.",
      "Take one lawful means this week.",
      "Pause one comparison source for seven days.",
    ],
    quiz: [
      {
        question: "What does waiting with sabr include?",
        options: [
          "Dua, lawful means, reduced comparison, and guarded hope",
          "Pretending the wait does not hurt",
          "Taking haram shortcuts because waiting is hard",
        ],
        correctAnswer:
          "Dua, lawful means, reduced comparison, and guarded hope",
        explanation:
          "Sabr while waiting keeps hope alive while still taking lawful means and avoiding despair or shortcuts.",
      },
    ],
    audioScript:
      "Waiting is not easy, but you are not waiting alone. Make dua, take lawful means, and guard hope.",
  },
  "raising-children-upon-islam-ch-1": {
    subtitle: "Let children see the Islam you want them to love",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Children learn from what repeats in the home. A parent can give beautiful reminders, but the strongest teaching is often what the child sees when nobody is performing: how adults pray, apologise, speak about absent people, handle anger, treat grandparents, and return after mistakes. Modelling before teaching does not mean parents must be perfect. It means the parent is willing to be seen trying, repenting, asking forgiveness, and taking Allah seriously in ordinary moments. A child who watches a parent repair harm may learn more than a child who only hears lectures about character. Where family conflict, trauma, disability, or safeguarding concerns exist, modelling also includes getting the right help.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What Islamic value does your child already see you practise without needing a lecture: prayer, honesty, apology, mercy, patience, Quran, or service?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one visible model this week. Let the child see you pray calmly, apologise clearly, give privately, read Quran, or pause your tongue before reacting.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect family responsibility with Luqman's teaching. This chapter is parenting guidance, not a ruling on age-specific obligations.",
      },
    ],
    reflectionQuestions: [
      "What do your children learn from your repeated behaviour?",
      "Where would a sincere apology teach more than a longer reminder?",
    ],
    actionSteps: [
      "Pick one behaviour to model visibly this week.",
      "Repair one mistake in front of the child when appropriate.",
      "Ask for qualified help where family harm or safety is involved.",
    ],
    quiz: [
      {
        question: "What is the strongest first lesson for children?",
        options: [
          "Repeated example joined to mercy and repair",
          "Lectures that adults do not practise",
          "Expecting perfection before teaching anything",
        ],
        correctAnswer: "Repeated example joined to mercy and repair",
        explanation:
          "Children need to see faith lived through worship, speech, apology, patience, and return.",
      },
    ],
    audioScript:
      "Children watch the Islam that repeats at home. Model prayer, repair, mercy, and honest return before adding more words.",
  },
  "raising-children-upon-islam-ch-2": {
    subtitle: "Build prayer familiarity with rhythm, warmth, and clarity",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Making salah familiar is different from making salah feel like a daily fight. Young children can know prayer through rhythm: the adhan, wudu, a prayer mat, quiet moments beside a parent, simple phrases, and seeing adults pause life for Allah. Older children need clearer structure, but structure works better when it is joined to warmth, preparation, and consistent example. Avoid turning every missed or delayed prayer into shouting, sarcasm, or comparison. Seriousness is needed, but shame can make worship feel unsafe. Parents should learn age-specific duties from qualified teachers and adapt carefully for illness, disability, anxiety, sensory needs, family instability, or trauma.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What does prayer feel like in your home most days: visible, rushed, peaceful, tense, hidden, inconsistent, or only discussed when someone is late?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create one prayer rhythm: a visible prayer space, a child-friendly wudu step, a calm adhan response, or a shared reminder before one daily prayer.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards for family responsibility and parent-child teaching. Specific legal duties by age and circumstance need qualified guidance.",
      },
    ],
    reflectionQuestions: [
      "What prayer rhythm could become familiar without pressure?",
      "Where does your tone around salah need more steadiness?",
    ],
    actionSteps: [
      "Make one child-friendly prayer cue visible.",
      "Model one calm prayer before correcting others.",
      "Ask a reliable teacher about age-specific expectations if unsure.",
    ],
    quiz: [
      {
        question: "How should salah become familiar to children?",
        options: [
          "Through visible rhythm, warmth, structure, and gradual teaching",
          "Only through anger when it is missed",
          "By hiding prayer until children ask for it",
        ],
        correctAnswer:
          "Through visible rhythm, warmth, structure, and gradual teaching",
        explanation:
          "Children benefit from seeing prayer as a lived rhythm before expectations become heavy.",
      },
    ],
    audioScript:
      "Let salah become part of the home's rhythm: visible, warm, structured, and taught with patience.",
  },
  "raising-children-upon-islam-ch-3": {
    subtitle: "Use stories to build character, not fear or performance",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Stories shape a child's moral imagination. They can make courage, honesty, gratitude, patience, and love of Allah feel close. But Islamic stories must be handled carefully. Do not invent details and present them as revelation. Do not use frightening stories to control behaviour. Do not turn every story into a test of performance. A good story moment asks: what did this teach about Allah, worship, character, and how to treat people? Children may need repetition, questions, drawing, role play, or one simple action after the story. If the story includes prophets, Quran, seerah, or hadith, stay close to reliable sources and say honestly when you do not know a detail.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which character quality could your next story strengthen: truthfulness, courage, mercy, gratitude, patience, humility, or care for family?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one reliable story and one character outcome. After telling it, ask one gentle question and choose one tiny action to practise.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Luqman's counsel anchors teaching through worship, character, humility, and speech. Avoid unsupported story details and fear-based control.",
      },
    ],
    reflectionQuestions: [
      "Do your story moments create love, curiosity, and character?",
      "Where do you need to say, I need to check that detail?",
    ],
    actionSteps: [
      "Pick one reliable story source.",
      "Name one character lesson only.",
      "Avoid adding dramatic details you cannot verify.",
    ],
    quiz: [
      {
        question: "What should Islamic stories build in children?",
        options: [
          "Love of Allah, character, curiosity, and honest learning",
          "Fear through invented details",
          "Public performance of piety",
        ],
        correctAnswer:
          "Love of Allah, character, curiosity, and honest learning",
        explanation:
          "Stories should stay reliable and help children connect faith to character without manipulation.",
      },
    ],
    audioScript:
      "Tell stories with honesty. Let them build love, character, and curiosity, without invented details or fear.",
  },
  "raising-children-upon-islam-ch-4": {
    subtitle: "Protect children with calm boundaries and real safeguarding",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Protecting children upon Islam is not panic. Panic can make parents harsh, suspicious, and reactive. Protection is calmer and stronger: clear routines, safe adults, age-appropriate device boundaries, modesty taught with dignity, open conversations, trusted Islamic learning, and a home where children can ask difficult questions without being mocked. Protection also means recognising real danger. Abuse, grooming, coercion, self-harm risk, severe bullying, exploitation, or unsafe adults need immediate safeguarding support, not only reminders. A Muslim parent should combine tawakkul with responsible action. The goal is not to control every thought a child has. The goal is to give them roots, trust, boundaries, and a path back to Allah.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where does your child need stronger protection right now: devices, friends, questions, safety, sleep, emotional connection, or Islamic learning?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one calm protection step: a device boundary, a safer adult rule, a weekly question time, a trusted class, or a private check-in.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support family responsibility. Safeguarding concerns need qualified local help and emergency support where there is danger.",
      },
    ],
    reflectionQuestions: [
      "What boundary would protect without creating panic?",
      "Can your child ask hard questions safely at home?",
    ],
    actionSteps: [
      "Set one calm, explainable boundary.",
      "Create one regular question space.",
      "Use safeguarding or emergency support for real danger.",
    ],
    quiz: [
      {
        question: "What does healthy protection combine?",
        options: [
          "Roots, trust, boundaries, and real safeguarding",
          "Panic and total control",
          "Ignoring danger to avoid discomfort",
        ],
        correctAnswer: "Roots, trust, boundaries, and real safeguarding",
        explanation:
          "Protection should be calm, responsible, and honest about both spiritual roots and real-world safety.",
      },
    ],
    audioScript:
      "Protect without panic. Build roots, trust, boundaries, and real safety, then keep the path back to Allah open.",
  },
  "explaining-islam-to-family-ch-1": {
    subtitle: "Lower the emotional heat before trying to be understood",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Family conversations about Islam often carry more than facts. They may carry fear, grief, culture, media images, past hurt, love, control, or confusion. Lowering the temperature means noticing that emotional layer before answering every question as a debate. Speak calmly, choose timing carefully, and avoid humiliating people for not understanding. This does not mean hiding Islam or accepting pressure to abandon worship. It means beginning with adab: I love you, I am learning, I want to answer honestly, and some questions need time. If family pressure becomes unsafe, coercive, violent, or legally complicated, the next step is trusted support, not a private argument.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What emotion usually sits underneath your family conversations about Islam: fear, embarrassment, grief, curiosity, anger, love, or confusion?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Prepare one calm opening sentence that lowers heat without hiding your faith. Use it before answering a difficult question.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor invitation in wisdom and respectful dialogue. Safety, housing, legal, or coercive pressure needs qualified local support.",
      },
    ],
    reflectionQuestions: [
      "What usually makes the conversation hotter?",
      "Which sentence can show love without surrendering truth?",
    ],
    actionSteps: [
      "Write one calm opening sentence.",
      "Choose a better time for one hard conversation.",
      "Seek help if family pressure becomes unsafe.",
    ],
    quiz: [
      {
        question: "Why lower the temperature first?",
        options: [
          "So truth can be heard with adab and safety",
          "So Islam can be hidden forever",
          "So every question becomes a debate",
        ],
        correctAnswer: "So truth can be heard with adab and safety",
        explanation:
          "Calmer conversations make honest explanation more possible while still protecting worship and safety.",
      },
    ],
    audioScript:
      "Before answering, lower the heat. Speak with adab, choose timing, and get support where pressure becomes unsafe.",
  },
  "explaining-islam-to-family-ch-2": {
    subtitle: "Give clear answers without pretending to know everything",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A simple answer is not a shallow answer. Family members often need clarity before detail: what Muslims believe about Allah, why prayer matters, what Islam changes in daily life, and what is culture rather than revelation. Answer with one main point, one example, and one honest limit. If you do not know, say so. If a topic needs a scholar, say that too. Do not guess about rulings, history, women, marriage, finance, politics, or other sensitive subjects just to win the moment. A truthful I need to check can protect both Islam and the relationship better than a confident mistake.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which family question makes you rush into too many details, and what is the one simple truth you actually need to explain first?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a three-part answer to one common question: one main point, one example from your life, and one limit where you will check before answering.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support wise invitation and respectful dialogue. They do not make the user an authority on every detailed ruling.",
      },
    ],
    reflectionQuestions: [
      "What question needs a simpler first answer?",
      "Where should you stop and check before speaking?",
    ],
    actionSteps: [
      "Choose one common question.",
      "Prepare one main point and one lived example.",
      "Name the topics you will not answer without checking.",
    ],
    quiz: [
      {
        question: "What makes a family answer safer?",
        options: [
          "One clear point, one example, and honest limits",
          "Guessing quickly to sound confident",
          "Turning every question into a long lecture",
        ],
        correctAnswer: "One clear point, one example, and honest limits",
        explanation:
          "Clarity and humility protect both the message and the relationship.",
      },
    ],
    audioScript:
      "Answer simply: one point, one example, and one honest limit. It is better to check than to guess.",
  },
  "explaining-islam-to-family-ch-3": {
    subtitle: "Keep family adab while protecting worship and conscience",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Respect without compromise is one of the hardest balances. A Muslim should keep adab with family: gentle speech, service, gratitude, patience, and avoiding unnecessary provocation. But respect does not mean agreeing to abandon prayer, lie about faith, join what is clearly haram, or accept harm. The safer path is specific and calm. Explain what you can do, what you cannot do, and what alternative you are offering. For example, you may still attend a family meal while avoiding alcohol, pray quietly at the right time, or show care in ways family can feel. If pressure becomes coercive or dangerous, involve trusted support.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where do you most need this balance: prayer times, food, clothing, gatherings, marriage pressure, holidays, privacy, or questions about belief?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one boundary in three lines: what you respect, what you cannot do, and what loving alternative you can offer.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards for wisdom and respectful dialogue. Complex family, legal, or safety cases need qualified advice beyond this chapter.",
      },
    ],
    reflectionQuestions: [
      "What family boundary needs more adab in its wording?",
      "What loving alternative could reduce the sense of rejection?",
    ],
    actionSteps: [
      "Write one respectful boundary.",
      "Offer one lawful alternative.",
      "Get trusted help if the boundary creates danger.",
    ],
    quiz: [
      {
        question: "What does respect without compromise require?",
        options: [
          "Gentle adab, clear limits, and safe support when needed",
          "Accepting everything to avoid conflict",
          "Speaking harshly to prove commitment",
        ],
        correctAnswer:
          "Gentle adab, clear limits, and safe support when needed",
        explanation:
          "A Muslim can protect worship and conscience while still speaking and serving with care.",
      },
    ],
    audioScript:
      "Respect your family with adab, but protect worship and conscience. Name the limit and offer a lawful alternative.",
  },
  "explaining-islam-to-family-ch-4": {
    subtitle: "Choose timing wisely without letting harm stay hidden",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Silence can be wisdom when the room is too heated, the question is not sincere, the timing is wrong, or answering would only deepen harm. A wise pause can protect relationships and prevent words that are hard to repair. But silence is not always wisdom. If someone is unsafe, coerced, abused, or being forced away from basic rights, silence may protect the harm rather than the person. Learn the difference. Delay a debate when delay helps. Seek help when help is needed. A useful rule is to ask: will speaking now bring clarity, or would a calmer time and a trusted person make the conversation safer?",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which conversations need a pause, and which situation needs support because silence would leave someone unsafe or isolated?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Prepare one pause phrase: I want to answer this properly, but not while we are upset. Can we speak later or with someone we both trust?",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support wise dialogue. This chapter should never be used to hide abuse, coercion, or urgent safety concerns.",
      },
    ],
    reflectionQuestions: [
      "Where would waiting make the answer better?",
      "Where would silence leave real harm unchallenged?",
    ],
    actionSteps: [
      "Use one calm pause phrase.",
      "Choose a safer time or trusted mediator.",
      "Escalate to support if there is coercion or danger.",
    ],
    quiz: [
      {
        question: "When is silence wise?",
        options: [
          "When delay prevents harm and a safer answer can follow",
          "When it hides abuse or coercion",
          "When it permanently avoids every sincere question",
        ],
        correctAnswer: "When delay prevents harm and a safer answer can follow",
        explanation:
          "A pause can be wise, but urgent harm needs support and protection.",
      },
    ],
    audioScript:
      "Sometimes wisdom is a pause. Sometimes wisdom is getting help. Learn which situation you are in.",
  },
  "the-last-ten-nights-ch-1": {
    subtitle: "Protect the nights before tiredness makes the decision",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The last ten nights should not depend on whatever energy is left after the day has taken everything. Protecting them means deciding before they arrive how you will handle sleep, work, family duties, meals, mosque travel, phone use, Quran, dua, and prayer. Quran 97 anchors the greatness of Laylat al-Qadr, but a responsible plan avoids claiming certainty about a specific night. Prepare for all ten according to capacity. Some people can worship for long hours. Others are parents, carers, workers, students, ill, pregnant, travelling, or exhausted. The plan should still keep a protected window, even if that window is small and sincere.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What usually takes your last ten nights first: sleep debt, shopping, social plans, work, cooking, scrolling, family pressure, or trying to do too much?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Block one realistic worship window for each of the last ten nights. Add a low-energy version so the plan survives hard days.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The Qadr source card confirms the night's greatness without guessing its exact date. Capacity and worship details should be handled honestly.",
      },
    ],
    reflectionQuestions: [
      "What needs to be moved before the last ten begin?",
      "What is your smallest sincere night plan?",
    ],
    actionSteps: [
      "Block one nightly worship window.",
      "Write a low-energy version of the plan.",
      "Reduce one predictable distraction before nightfall.",
    ],
    quiz: [
      {
        question: "How should the last ten nights be protected?",
        options: [
          "Plan all ten with capacity and avoid date certainty claims",
          "Only worship if energy happens to remain",
          "Claim one exact night with certainty",
        ],
        correctAnswer:
          "Plan all ten with capacity and avoid date certainty claims",
        explanation:
          "The last ten are protected through planning, sincerity, and avoiding unsupported certainty about the exact night.",
      },
    ],
    audioScript:
      "Protect the nights before tiredness decides for you. Plan all ten, keep capacity real, and avoid certainty claims.",
  },
  "the-last-ten-nights-ch-2": {
    subtitle: "Make dua specific enough to soften the heart",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A dua list is not a shopping list with Allah. It is a way to bring the heart's need into worship with honesty, hope, and humility. In the last ten nights, make the list wide enough for deen and dunya: forgiveness, guidance, prayer, Quran, family, health, lawful provision, protection from sin, the oppressed, the dead, the ummah, and the people you struggle to forgive. Keep the requests lawful and sincere. Do not turn dua into a bargain where worship is only worth doing if the answer appears immediately. Dua can change the servant even before the circumstance changes, because it teaches need and dependence.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What does your dua list usually miss: forgiveness, guidance, family repair, the ummah, the dead, private sins, lawful provision, or gratitude?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Build a seven-line dua list: forgiveness, guidance, one family need, one ummah need, one private struggle, one lawful dunya need, and one gratitude.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor Laylat al-Qadr, Quran recitation, and dua as worship. Specific supplications should be learned from reliable sources.",
      },
    ],
    reflectionQuestions: [
      "Which dua would you make if you were completely honest with Allah?",
      "Who should be included in your dua besides yourself?",
    ],
    actionSteps: [
      "Write a seven-line dua list.",
      "Include one person you usually forget.",
      "Ask with hope without demanding your preferred timing.",
    ],
    quiz: [
      {
        question: "What should a dua list do?",
        options: [
          "Organise sincere need, gratitude, and hope",
          "Turn worship into a transaction",
          "Include only worldly requests",
        ],
        correctAnswer: "Organise sincere need, gratitude, and hope",
        explanation:
          "A dua list helps the servant ask with presence, breadth, and dependence on Allah.",
      },
    ],
    audioScript:
      "Make your dua list honest: forgiveness, guidance, family, the ummah, private struggle, lawful needs, and gratitude.",
  },
  "the-last-ten-nights-ch-3": {
    subtitle: "Hold Quran and qiyam with a plan your body can keep",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Quran and qiyam are at the heart of many last-ten plans, but the plan must be worship, not self-punishment. Some users can pray long portions at night. Others may need a shorter prayer, a few pages with meaning, listening attentively, reviewing memorisation, or standing behind an imam. The goal is presence, sincerity, and consistency according to ability. Do not compare your private capacity to someone else's public highlight. If menstruation, illness, travel, exhaustion, work, or caregiving affects what you can do, learn the relevant guidance from qualified teachers and keep the doors of remembrance, dua, charity, and Quran connection open in the ways available to you.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What Quran or qiyam plan is sincere and repeatable for you this year, not for the person you imagine you should be?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose three modes: full-energy Quran/qiyam, normal-energy Quran/qiyam, and exhausted-energy remembrance or dua so the night still has a door.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support Quran connection and dua. Personal worship rulings during illness, travel, or menstruation need qualified guidance.",
      },
    ],
    reflectionQuestions: [
      "What comparison makes your worship plan unrealistic?",
      "What is your exhausted-energy door back to worship?",
    ],
    actionSteps: [
      "Write three energy-based worship modes.",
      "Prepare the Quran passage or dua before night.",
      "Ask qualified guidance for personal worship restrictions.",
    ],
    quiz: [
      {
        question: "What makes a Quran and qiyam plan healthier?",
        options: [
          "Sincerity, capacity, and repeatable worship",
          "Copying someone else's highlight exactly",
          "Stopping completely if the ideal plan fails",
        ],
        correctAnswer: "Sincerity, capacity, and repeatable worship",
        explanation:
          "A sustainable plan protects worship across different levels of energy and personal circumstances.",
      },
    ],
    audioScript:
      "Build Quran and qiyam around capacity. Full energy, normal energy, and exhausted energy can each have a door to Allah.",
  },
  "the-last-ten-nights-ch-4": {
    subtitle: "Let Eid be joy without dropping the rope of worship",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The last ten nights should lead into Eid with gratitude, not spiritual collapse. Eid is a day of joy, family, food, generosity, and lawful celebration, but the heart still needs a rope after Ramadan. The user should choose a small post-Ramadan continuation before Eid arrives: one prayer protected more carefully, one Quran rhythm, one weekly charity, one family repair, or one screen boundary. Avoid making impossible promises in the emotion of the final night. Also avoid treating slips after Ramadan as proof that the month failed. The sign of a good plan is not perfection. It is a path of return that continues after the special season closes.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What usually drops after Eid first: Fajr, Quran, dua, charity, lower screen use, family patience, or careful speech?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Before Eid, choose one tiny continuation for the next two weeks. Make it small enough to survive guests, travel, food, and tiredness.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect the last ten to worship, Quran, and dua. Eid joy should remain lawful and grateful without pretending Ramadan never ended.",
      },
    ],
    reflectionQuestions: [
      "What Ramadan gain needs protection after Eid?",
      "What tiny habit would keep the rope in your hand?",
    ],
    actionSteps: [
      "Choose one two-week continuation habit.",
      "Keep the Eid plan lawful, joyful, and grateful.",
      "Return quickly if the first post-Ramadan week is messy.",
    ],
    quiz: [
      {
        question: "What should happen after Eid?",
        options: [
          "Joy with one small continuation of worship",
          "Spiritual collapse because Ramadan ended",
          "Impossible promises that cannot survive normal life",
        ],
        correctAnswer: "Joy with one small continuation of worship",
        explanation:
          "Eid can be joyful while the believer protects one realistic thread from Ramadan.",
      },
    ],
    audioScript:
      "Let Eid be joyful and grateful. Keep one small rope from Ramadan in your hand and return quickly after slips.",
  },
  "advanced-hifz-review-ch-1": {
    subtitle: "Find the weak points without turning review into shame",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Advanced hifz review begins with diagnosis, not panic. A weak passage is not proof that the Quran has left you. It is information about what needs care. Diagnose by listening to yourself, reciting to a teacher or reliable partner, marking repeated hesitation, similar endings, weak tajweed points, and places where meaning is unclear. Separate three problems: memory gaps, recitation accuracy, and attention. Each needs a different repair. Do not only repeat the page faster. Slow down, identify the pattern, and rebuild with adab. If you have no teacher, use this chapter to prepare better notes for finding one rather than becoming your only judge.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What kind of weakness appears most in your hifz: hesitation, wrong endings, similar ayat, tajweed gaps, low focus, or avoiding old portions?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Record or recite one weak passage. Mark each mistake as memory, recitation, attention, or similar-ayah confusion, then choose one repair step.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support Quran recitation according to ability and seeking knowledge. Tajweed and ijazah-level correction need qualified teachers.",
      },
    ],
    reflectionQuestions: [
      "Which weakness is asking for diagnosis rather than more guilt?",
      "Who can listen to you with accuracy and mercy?",
    ],
    actionSteps: [
      "Audit one weak passage.",
      "Label the mistake pattern honestly.",
      "Take one correction to a teacher or reliable reviewer.",
    ],
    quiz: [
      {
        question: "What should diagnosis separate?",
        options: [
          "Memory gaps, recitation accuracy, and attention",
          "Only how embarrassed the learner feels",
          "Speed without checking accuracy",
        ],
        correctAnswer: "Memory gaps, recitation accuracy, and attention",
        explanation:
          "Different weaknesses need different repair, and review should stay truthful without shame.",
      },
    ],
    audioScript:
      "A weak passage is information, not failure. Diagnose memory, recitation, and attention, then repair with patience.",
  },
  "advanced-hifz-review-ch-2": {
    subtitle: "Use spaced repetition so old memorisation keeps breathing",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Hifz weakens when review only happens after fear rises. Spaced repetition makes review predictable before forgetting becomes heavy. Divide memorisation into new, warm, weak, and mature portions. New pages need frequent contact. Weak pages need focused repair. Mature portions need scheduled returns so they do not quietly fade. The schedule should match your real life, teacher, school, work, sleep, and prayer times. A beautiful plan that cannot be repeated is not advanced. It is decoration. Keep the amount small enough to protect accuracy. For serious hifz goals, align the schedule with a teacher who can hear recitation and correct drift.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which portion of your hifz is being neglected: new memorisation, recent pages, weak old pages, or mature portions you assume are safe?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create four buckets for this week: new, warm, weak, and mature. Put one realistic review amount into each bucket.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support regular Quran connection and knowledge. Review schedules should serve accuracy, not only completion speed.",
      },
    ],
    reflectionQuestions: [
      "Which bucket needs more regular attention?",
      "What amount can you repeat without harming accuracy?",
    ],
    actionSteps: [
      "Create four review buckets.",
      "Assign a realistic weekly amount to each.",
      "Review the schedule with a teacher if possible.",
    ],
    quiz: [
      {
        question: "What is the aim of spaced repetition in hifz?",
        options: [
          "Predictable review before forgetting becomes heavy",
          "Avoiding old portions until they collapse",
          "Adding new pages without review",
        ],
        correctAnswer: "Predictable review before forgetting becomes heavy",
        explanation:
          "A spaced plan keeps new, weak, and mature portions connected to regular review.",
      },
    ],
    audioScript:
      "Do not wait for panic to review. Build buckets for new, warm, weak, and mature portions, then keep returning.",
  },
  "advanced-hifz-review-ch-3": {
    subtitle: "Turn repeated mistakes into a repair map",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A mistake log is not a shame diary. It is a repair map. Write the surah, ayah, phrase cue, mistake type, likely cause, and the correction. Patterns will appear: similar endings, skipped connectors, weak transitions, tired review times, rushing, or tajweed points that were never rebuilt. Once the pattern is visible, the repair becomes smaller and wiser. Read the phrase before and after the mistake. Link the meaning where possible. Recite to someone who can catch what you miss. Do not let the log become a way to obsess. Its purpose is to reduce repeated errors and return the learner to calmer recitation.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which mistake repeats often enough that it deserves a written repair map instead of another frustrated restart?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make a five-row mistake log for one surah or juz. Add the correction and one trigger that may have caused the mistake.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "Use the source cards to keep review attached to Quran and knowledge. Technical recitation mistakes should be checked with qualified reciters.",
      },
    ],
    reflectionQuestions: [
      "What pattern appears behind your repeated mistakes?",
      "When does tiredness or rushing make errors more likely?",
    ],
    actionSteps: [
      "Create a five-row mistake log.",
      "Add the phrase before and after each mistake.",
      "Retest the same rows after two days.",
    ],
    quiz: [
      {
        question: "What is a mistake log for?",
        options: [
          "Finding patterns and repairing repeated errors",
          "Collecting shame",
          "Replacing qualified recitation correction",
        ],
        correctAnswer: "Finding patterns and repairing repeated errors",
        explanation:
          "The log turns repeated mistakes into specific repair work while keeping teacher correction important.",
      },
    ],
    audioScript:
      "A mistake log is a map, not a punishment. Find the pattern, repair the phrase, and return calmly.",
  },
  "advanced-hifz-review-ch-4": {
    subtitle: "Review the whole path without making speed the master",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A monthly khatm review plan can help advanced students see the whole journey, but it must not become a race that damages accuracy. For some learners, monthly full review is realistic. For others, it needs a longer cycle approved by a teacher. The principle is whole-path accountability: every portion should have a known return date. Track what was recited, what was heard by someone else, what needs repair, and what should move into next month's weak list. Include rest and life duties honestly. The Quran is not a productivity trophy. It is revelation carried with humility, accuracy, and regular return.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Would a monthly full review protect your hifz right now, or would a slower teacher-approved cycle protect accuracy better?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a review calendar with return dates for every portion you carry. Mark which parts need listening, repair, or lighter maintenance.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support Quran recitation according to ability. A review cycle should be set with accuracy and qualified listening in mind.",
      },
    ],
    reflectionQuestions: [
      "Does your current cycle cover everything you have memorised?",
      "Where is speed quietly harming accuracy?",
    ],
    actionSteps: [
      "Create a full review calendar.",
      "Mark portions for repair, listening, and maintenance.",
      "Adjust the cycle with a teacher where possible.",
    ],
    quiz: [
      {
        question: "What should a full review cycle protect?",
        options: [
          "Accuracy, regular return, and whole-path accountability",
          "Speed above all else",
          "A public image of progress",
        ],
        correctAnswer:
          "Accuracy, regular return, and whole-path accountability",
        explanation:
          "Advanced review should make every portion return on purpose without sacrificing accuracy.",
      },
    ],
    audioScript:
      "Let every portion have a return date. Review the whole path with accuracy, humility, and a teacher where possible.",
  },
  "remembering-death-and-akhirah-ch-1": {
    subtitle: "Let the shortness of life clarify what deserves your heart",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Remembering death is not meant to make a believer cold, hopeless, or detached from mercy. It is meant to make life honest. Time is limited, the return to Allah is real, and not every worry deserves the same place in the heart. A healthy remembrance of death asks: what would I repair if I stopped pretending there is endless time? Prayer, repentance, family rights, debts, apologies, Quran, character, and hidden sins become clearer when life is seen as temporary. This chapter should not be used to intensify anxiety or grief. If death thoughts become intrusive or frightening, seek human and professional support while keeping spiritual hope alive.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "If you took the shortness of life seriously today, what would become clearer: prayer, apology, debt, family, Quran, repentance, or service?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one small repair that would still matter if life were shorter than you imagine: a prayer, message, payment, dua, or hidden tawbah.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor death and life as a test of excellent action. Mental health distress needs compassionate support, not isolation.",
      },
    ],
    reflectionQuestions: [
      "What would become less important if you remembered the return to Allah?",
      "What would become more urgent in a healthy way?",
    ],
    actionSteps: [
      "Pick one small repair today.",
      "Avoid using death reflection to feed despair.",
      "Seek help if thoughts about death become intrusive or unsafe.",
    ],
    quiz: [
      {
        question: "What should remembering death clarify?",
        options: [
          "Repair, worship, rights, and what truly matters",
          "Hopelessness and isolation",
          "Neglect of worldly responsibilities",
        ],
        correctAnswer: "Repair, worship, rights, and what truly matters",
        explanation:
          "A sound remembrance of death should increase honesty, worship, and hope rather than despair.",
      },
    ],
    audioScript:
      "Life is short enough to become honest. Repair one thing today without letting death reflection become despair.",
  },
  "remembering-death-and-akhirah-ch-2": {
    subtitle: "Repent today before delay becomes the habit",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Repentance belongs to today because delay slowly becomes a second sin. The heart says, later I will stop, later I will apologise, later I will fix the money, later I will pray properly. Remembering death interrupts that lie with mercy. It says return now while the door is open. Tawbah includes leaving the sin, regretting it, resolving not to return, and restoring people's rights where they were harmed. Do not confuse repentance with self-hatred. The point is not to stare at the stain. The point is to turn back to Allah and take the next truthful step before the heart gets comfortable with distance.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What have you been delaying under the word later: leaving a sin, returning a right, apologising, asking help, or protecting a prayer?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make one same-day tawbah step: delete a path to sin, return a right, send a repair message, pray two rak'ahs, or ask for help.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards on death and life as a test support urgency without despair. Rights owed to people should be restored carefully.",
      },
    ],
    reflectionQuestions: [
      "Where has later become a habit?",
      "What right or pattern can be addressed today?",
    ],
    actionSteps: [
      "Name one delayed repentance step.",
      "Do one repair before the day ends.",
      "Ask qualified help if the issue is complex or harmful.",
    ],
    quiz: [
      {
        question: "What does healthy repentance include?",
        options: [
          "Return to Allah and repair rights where possible",
          "Self-hatred without change",
          "Waiting until life feels easy",
        ],
        correctAnswer: "Return to Allah and repair rights where possible",
        explanation:
          "Repentance should move the believer toward Allah, away from sin, and toward restoring rights.",
      },
    ],
    audioScript:
      "Do not let later become the habit. Return today, repair one right, and take the next truthful step.",
  },
  "remembering-death-and-akhirah-ch-3": {
    subtitle: "Let the Hereafter enter ordinary decisions",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Akhirah is not only a subject for funerals and lectures. It should enter ordinary decisions: how money is earned, how messages are written, how anger is handled, how family is treated, what is watched, what is hidden, and what is posted. The question is not only, can I get away with this? The question is, would I want to meet Allah with this choice? That question does not remove mercy, enjoyment, work, or planning for dunya. It puts them in order. Dunya becomes a field where intentions, rights, worship, and character are planted. Akhirah thinking makes the small moment serious without making life dark.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which ordinary decision most needs akhirah awareness right now: spending, speech, screen use, private sin, work, family, or anger?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Before one decision today, ask: would I want to meet Allah with this choice? Then adjust one part of the decision.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor accountability and excellent action. This reflection guides conscience, not detailed rulings for complex cases.",
      },
    ],
    reflectionQuestions: [
      "Where do you act as if the moment is too small to matter?",
      "What choice would look different if akhirah was present?",
    ],
    actionSteps: [
      "Apply the meeting-Allah question once today.",
      "Adjust one message, purchase, or private choice.",
      "Ask a scholar where the decision involves a ruling.",
    ],
    quiz: [
      {
        question: "How should akhirah awareness affect daily choices?",
        options: [
          "It orders intentions, rights, worship, and character",
          "It makes lawful enjoyment forbidden",
          "It only matters at funerals",
        ],
        correctAnswer: "It orders intentions, rights, worship, and character",
        explanation:
          "The Hereafter gives daily choices seriousness, direction, and accountability.",
      },
    ],
    audioScript:
      "Let akhirah enter the ordinary moment. Ask what you would want to meet Allah with, then choose cleaner.",
  },
  "remembering-death-and-akhirah-ch-4": {
    subtitle: "Leave goodness behind without turning legacy into ego",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Leaving good behind is not the same as building a name. A believer's legacy may be quiet: children taught with mercy, debts settled, apologies made, knowledge shared responsibly, a habit of charity, a cleaner family culture, a useful skill, a repaired relationship, or a private deed nobody praises. Remembering death should make the user ask what good will continue because they lived. But legacy can become ego if it is only about image, followers, buildings, or being remembered. The better question is: what would benefit people and please Allah even if my name was not attached? Start small, sincere, and useful.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What good could continue after you: a taught child, repaired right, useful knowledge, charity habit, family adab, or a quieter private deed?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one legacy action this month that is useful without needing your name attached: teach, repair, give, document, mentor, or serve.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards keep legacy tied to accountability and excellent action. Avoid unsupported reward claims and keep sincerity central.",
      },
    ],
    reflectionQuestions: [
      "What good would matter even without public credit?",
      "Where is legacy mixing with image?",
    ],
    actionSteps: [
      "Choose one quiet legacy action.",
      "Remove one unnecessary need for credit.",
      "Make sure any promise or donation is realistic.",
    ],
    quiz: [
      {
        question: "What makes legacy healthier?",
        options: [
          "Useful goodness with sincerity, even without public credit",
          "Only being remembered by people",
          "Making promises that cannot be kept",
        ],
        correctAnswer:
          "Useful goodness with sincerity, even without public credit",
        explanation:
          "A Muslim legacy should focus on benefit, sincerity, and accountability rather than image.",
      },
    ],
    audioScript:
      "Leave good behind quietly. Teach, repair, give, serve, and let sincerity matter more than being remembered.",
  },
  "purpose-beyond-dunya-ch-1": {
    subtitle: "Ask what your work is building in your akhirah",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "What are you building is not only a career question. It is a worship question. A person may build income, skills, reputation, products, family comfort, knowledge, or influence, but the deeper question is what those things are building in the heart. Are they increasing gratitude, service, honesty, salah, family responsibility, and lawful benefit, or are they building pride, envy, neglect, and private disobedience? Purpose beyond dunya does not mean abandoning dunya. It means refusing to let dunya become the master. The source cards anchor purpose, good in both worlds, and intention so ambition can be weighed before it quietly owns the heart.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What are you currently building most: income, image, skill, comfort, influence, family stability, knowledge, or nearness to Allah?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one sentence that connects your current work or study to worship, service, lawful benefit, and the Hereafter.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect purpose, dunya and akhirah, and intention. This chapter guides review, not a ruling on every career path.",
      },
    ],
    reflectionQuestions: [
      "What is your current ambition building in your character?",
      "Where has dunya become louder than purpose?",
    ],
    actionSteps: [
      "Write a one-sentence purpose review.",
      "Identify one way your work can serve people lawfully.",
      "Remove one habit that feeds image more than benefit.",
    ],
    quiz: [
      {
        question: "What does purpose beyond dunya require?",
        options: [
          "Using worldly work for worship, service, and lawful benefit",
          "Abandoning every worldly responsibility",
          "Letting income or image define the heart",
        ],
        correctAnswer:
          "Using worldly work for worship, service, and lawful benefit",
        explanation:
          "Dunya can be used responsibly when intention, worship, and the Hereafter remain central.",
      },
    ],
    audioScript:
      "Ask what your work is building in your heart. Let dunya serve worship, service, and the Hereafter.",
  },
  "purpose-beyond-dunya-ch-2": {
    subtitle: "Treat ambition as a trust, not a private throne",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Ambition can be an amanah when it is lawful, useful, disciplined, and accountable to Allah. A Muslim does not need to fear excellence. The danger is ambition without boundaries: neglecting prayer, family, health, honesty, employees, customers, or the poor because growth became the only measure. Treat ambition as a trust by asking what rights come with it. More skill means more responsibility. More wealth means more questions about earning, spending, giving, and arrogance. More influence means more care with truth. This chapter should make ambition cleaner, not smaller. The aim is to become capable without becoming owned by capability.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which right is most at risk when your ambition rises: salah, family, honesty, health, staff, customers, charity, humility, or rest?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Add one amanah guardrail to a goal: prayer protected, no false claims, family time kept, lawful money checked, or rest planned.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards hold ambition under purpose, intention, and good in both worlds. Financial or legal questions need qualified advice.",
      },
    ],
    reflectionQuestions: [
      "What responsibility increases with your ambition?",
      "Which guardrail would keep growth cleaner?",
    ],
    actionSteps: [
      "Name one ambition as an amanah.",
      "Add one practical guardrail.",
      "Review whether the goal protects prayer and rights.",
    ],
    quiz: [
      {
        question: "When can ambition be healthier?",
        options: [
          "When it stays lawful, useful, and accountable",
          "When it ignores every right for growth",
          "When it exists only for status",
        ],
        correctAnswer: "When it stays lawful, useful, and accountable",
        explanation:
          "Ambition can be a trust when it serves good and respects Allah's limits and people's rights.",
      },
    ],
    audioScript:
      "Ambition is a trust. Let growth carry guardrails: prayer, honesty, family, lawful income, and humility.",
  },
  "purpose-beyond-dunya-ch-3": {
    subtitle: "Protect sincerity when status starts tasting sweet",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Status can enter quietly. A person begins with service, then starts needing to be seen as the one who serves. They begin with learning, then need to be seen as knowledgeable. They begin with excellence, then need applause to feel real. Sincerity is protected by regular intention checks, hidden deeds, accepting correction, refusing exaggeration, and being willing to do useful work that brings no public credit. This does not mean every public role is insincere. It means public roles need private roots. Ask whether praise changes your worship, whether criticism destroys your identity, and whether you would still do the good if nobody knew.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where does status taste sweetest for you: knowledge, business, beauty, followers, family reputation, mosque work, charity, or being needed?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one hidden good deed this week and one exaggeration to remove from how you describe yourself or your work.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect purpose with intention. Public service can be good, but it needs private sincerity and truthful limits.",
      },
    ],
    reflectionQuestions: [
      "Would you still do this good without being seen?",
      "What praise or criticism affects you too much?",
    ],
    actionSteps: [
      "Do one hidden good deed.",
      "Remove one exaggeration from your presentation.",
      "Accept one correction without defending your image.",
    ],
    quiz: [
      {
        question: "What helps protect sincerity?",
        options: [
          "Hidden deeds, truthful limits, and intention checks",
          "Needing praise before doing good",
          "Exaggerating impact for status",
        ],
        correctAnswer: "Hidden deeds, truthful limits, and intention checks",
        explanation:
          "Sincerity needs private roots, honest speech, and regular review of why the deed is being done.",
      },
    ],
    audioScript:
      "Status tastes sweet, so protect sincerity with hidden deeds, truthful limits, and intention checks.",
  },
  "purpose-beyond-dunya-ch-4": {
    subtitle: "Measure what still matters when the numbers fade",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Modern life measures many things: income, followers, grades, steps, streaks, views, rankings, and speed. Some metrics are useful, but they become dangerous when they replace what Allah values. Measure what lasts by reviewing prayer, honesty, family rights, lawful work, service, knowledge, repentance, generosity, and the hidden choices that no dashboard can see. This does not reject planning or performance. It puts them under a higher question: did this make me more obedient, useful, truthful, grateful, and ready to meet Allah? A monthly review can hold both worlds together: dunya responsibilities are handled, and akhirah direction is not forgotten.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which number currently has too much power over your mood: money, grades, followers, weight, streaks, sales, rankings, or productivity?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a monthly review with two columns: useful dunya metrics and lasting akhirah measures. Put one item in each column.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect purpose, both-worlds dua, and intention. Metrics can help, but they must not become the heart's judge.",
      },
    ],
    reflectionQuestions: [
      "What do you measure that Allah did not ask you to worship?",
      "Which hidden measure needs more attention?",
    ],
    actionSteps: [
      "Make a two-column monthly review.",
      "Reduce one number's control over your mood.",
      "Add one lasting measure such as prayer, honesty, or service.",
    ],
    quiz: [
      {
        question: "What should lasting measures include?",
        options: [
          "Worship, rights, truthfulness, service, and readiness for Allah",
          "Only public numbers and visible rankings",
          "No planning or review at all",
        ],
        correctAnswer:
          "Worship, rights, truthfulness, service, and readiness for Allah",
        explanation:
          "Useful metrics can remain, but they should sit under deeper measures that last.",
      },
    ],
    audioScript:
      "Measure what lasts: prayer, rights, truthfulness, service, and readiness for Allah when the numbers fade.",
  },
  "social-media-discipline-ch-1": {
    subtitle: "Notice what the feed takes before calling it harmless",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "The attention trap is not only wasted minutes. It is the way a feed can train the heart to chase novelty, react quickly, compare constantly, and delay worship. Social media may contain benefit: learning, reminders, family contact, work, and community. But benefit does not erase cost. A disciplined user asks what the app takes before and after use: focus, salah timing, sleep, modesty, speech, gratitude, or emotional calm. The aim is not dramatic deletion for everyone. It is honest ownership. If the phone is repeatedly taking the first moments of the morning, the last moments before sleep, or the space needed for prayer, the boundary is no longer optional.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What does social media take from you most often: time, focus, prayer, sleep, gratitude, modesty, family attention, or emotional calm?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one attention boundary for seven days: no phone before Fajr, no scrolling in bed, app timer, home-screen removal, or prayer-time lockout.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect online discipline with gaze and speech. If use feels compulsive or harmful, seek practical and professional support.",
      },
    ],
    reflectionQuestions: [
      "When does the feed most reliably pull you away from worship?",
      "What boundary would protect attention without becoming unrealistic?",
    ],
    actionSteps: [
      "Pick one seven-day attention boundary.",
      "Move one app away from your home screen.",
      "Review whether prayer and sleep improved.",
    ],
    quiz: [
      {
        question: "What should social media discipline first measure?",
        options: [
          "What the feed takes from worship, focus, and character",
          "Only whether the content is entertaining",
          "How long others spend online",
        ],
        correctAnswer: "What the feed takes from worship, focus, and character",
        explanation:
          "Attention discipline begins by noticing cost, not only counting minutes.",
      },
    ],
    audioScript:
      "The feed takes more than minutes. Notice what it takes from prayer, sleep, gratitude, speech, and focus.",
  },
  "social-media-discipline-ch-2": {
    subtitle: "See curated lives without letting envy lead the heart",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Comparison online often begins before the user notices envy. A person sees filtered beauty, wealth, marriage, children, travel, knowledge, worship, business success, or public praise, then feels smaller, delayed, or cheated. The feed is not neutral. It shows fragments and invites the heart to judge a whole life from a polished moment. Discipline means interrupting that judgement. Make dua for the person's good, ask what the post is stirring in you, and return to gratitude for what Allah has actually placed in your hand. If an account repeatedly feeds envy, desire, resentment, or despair, muting it can be an act of protection.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which online comparison affects you most: beauty, marriage, money, children, travel, worship, business, knowledge, or popularity?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Mute one account or topic that repeatedly produces envy or despair, and replace that moment with one gratitude note or dua for the person.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards guard dignity, speech, and gaze. Comparison should be treated as a heart signal, not a reason to resent people.",
      },
    ],
    reflectionQuestions: [
      "What kind of post leaves your heart less grateful?",
      "Who can you make dua for instead of competing with privately?",
    ],
    actionSteps: [
      "Mute one comparison trigger.",
      "Write one gratitude note after seeing a trigger.",
      "Make dua for someone you were tempted to envy.",
    ],
    quiz: [
      {
        question: "What does comparison online often forget?",
        options: [
          "That posts are fragments, not full lives",
          "That envy improves gratitude",
          "That every public success is false",
        ],
        correctAnswer: "That posts are fragments, not full lives",
        explanation:
          "The feed shows partial moments, so the heart needs gratitude, dua, and boundaries.",
      },
    ],
    audioScript:
      "Curated lives are fragments. When comparison rises, make dua, protect gratitude, and mute what keeps injuring the heart.",
  },
  "social-media-discipline-ch-3": {
    subtitle: "Guard the gaze where the eyes scroll fastest",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Lowering the gaze online requires more than good intentions. The phone can deliver temptation faster than the heart can prepare. A user should know the trigger path: explore pages, reels, late-night scrolling, private messages, search suggestions, fitness content, celebrity accounts, or boredom. Guarding the gaze means changing the path before the image appears: unfollowing, blocking, filtering, disabling recommendations, avoiding private browsing loops, and leaving the phone outside vulnerable spaces. Shame alone rarely builds discipline. Tawbah, friction, better routines, and support are stronger. If explicit content use feels compulsive, repeated, or secretive, get real help rather than only promising again.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where does the gaze slip online most often: recommendations, private messages, late night, boredom, stress, search, or certain accounts?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Remove one trigger path today: unfollow, block, reset recommendations, set content restrictions, or keep the phone out of one vulnerable room.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor gaze and dignity. Persistent explicit-content habits may need accountability, counselling, or specialist support.",
      },
    ],
    reflectionQuestions: [
      "What path usually appears before the image?",
      "What friction would make the slip less easy?",
    ],
    actionSteps: [
      "Remove one online gaze trigger.",
      "Set one device or app restriction.",
      "Ask for help if the pattern is compulsive.",
    ],
    quiz: [
      {
        question: "What helps protect the gaze online?",
        options: [
          "Changing the trigger path before temptation appears",
          "Relying on shame alone",
          "Keeping every trigger and hoping for ease",
        ],
        correctAnswer: "Changing the trigger path before temptation appears",
        explanation:
          "Online gaze discipline needs friction, boundaries, repentance, and support where needed.",
      },
    ],
    audioScript:
      "Guard the gaze before the image appears. Remove trigger paths, add friction, and get help when secrecy keeps repeating.",
  },
  "social-media-discipline-ch-4": {
    subtitle: "Build a feed that helps worship and character breathe",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A cleaner feed is not only fewer bad posts. It is an environment where worship, gratitude, knowledge, family, health, and service can breathe. Clean the feed in layers: remove accounts that normalise sin, gossip, lust, mockery, resentment, waste, or fake urgency; reduce accounts that trigger comparison; keep beneficial reminders from reliable sources; and protect offline spaces where no feed is present. Be careful with religious content too. Not every confident clip is knowledge, and not every argument deserves your attention. A disciplined feed should make salah easier, speech safer, gaze cleaner, and the heart less reactive.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "After using your feed, are you usually more grateful, more distracted, more tempted, more angry, more informed, or more ready to worship?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Do a ten-minute feed audit: unfollow three harmful accounts, mute one comparison trigger, and save one reliable beneficial source.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards keep online discipline tied to gaze and speech. Religious content should be checked for reliability, not only confidence.",
      },
    ],
    reflectionQuestions: [
      "What does your feed make easier: obedience or distraction?",
      "Which religious source needs reliability before trust?",
    ],
    actionSteps: [
      "Unfollow three harmful accounts.",
      "Mute one comparison trigger.",
      "Create one phone-free worship or family space.",
    ],
    quiz: [
      {
        question: "What should a cleaner feed support?",
        options: [
          "Salah, safer speech, cleaner gaze, and calmer character",
          "More outrage and comparison",
          "Every confident religious clip",
        ],
        correctAnswer:
          "Salah, safer speech, cleaner gaze, and calmer character",
        explanation:
          "A feed should be treated as an environment that shapes worship and character.",
      },
    ],
    audioScript:
      "Build a cleaner feed: less temptation, less comparison, safer speech, reliable knowledge, and more room for worship.",
  },
  "lowering-the-gaze-ch-1": {
    subtitle: "Understand the trigger before blaming only willpower",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A gaze slip usually has a chain before it: tiredness, loneliness, stress, boredom, resentment, late-night phone use, certain routes, certain accounts, or the belief that one look will not matter. Understanding the trigger does not excuse the choice. It helps the user fight it earlier. The Quranic anchor on gaze is serious because the eyes shape the heart. But serious does not mean hopeless. Start by mapping when, where, and why the gaze becomes vulnerable. Then design a response before the moment arrives. If the pattern involves explicit content, secrecy, compulsion, or harm to relationships, combine tawbah with practical support and accountability.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What usually comes before the gaze slips: tiredness, loneliness, stress, boredom, anger, late nights, a route, an app, or a private habit?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Map one trigger chain in four steps: feeling, place, access, and choice. Then choose the earliest point where you can interrupt it.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor gaze and dignity. This chapter supports self-awareness, not excuses or despair.",
      },
    ],
    reflectionQuestions: [
      "What is the earliest point in your trigger chain?",
      "Where does secrecy make the pattern stronger?",
    ],
    actionSteps: [
      "Write one four-step trigger chain.",
      "Choose one earlier interruption point.",
      "Get accountability if the pattern is repeated or secretive.",
    ],
    quiz: [
      {
        question: "Why understand the trigger?",
        options: [
          "To fight earlier with honesty and responsibility",
          "To excuse the slip completely",
          "To ignore the gaze command",
        ],
        correctAnswer: "To fight earlier with honesty and responsibility",
        explanation:
          "Trigger awareness helps discipline begin before the vulnerable moment arrives.",
      },
    ],
    audioScript:
      "The gaze slip has a chain. Map the feeling, place, access, and choice, then interrupt it earlier.",
  },
  "lowering-the-gaze-ch-2": {
    subtitle: "Add friction where temptation keeps finding an open door",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Designing friction is not weakness. It is wisdom. If a route, room, app, search pattern, group chat, show, gym time, or late-night device habit repeatedly opens the same door, then relying on willpower alone is not a plan. Friction can be simple: content restrictions, no phone in bed, different commute habits, safer browsing settings, avoiding certain aisles or accounts, accountability software, earlier sleep, or leaving a conversation when it turns suggestive. The goal is not to become paranoid. The goal is to make obedience easier and sin less convenient. A believer still chooses, but the environment no longer pushes the weakest moment.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which open door needs friction: phone, room, route, account, search, show, private messages, sleep, or social setting?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one friction step for the next seven days and make it visible: setting changed, app removed, room rule written, or accountability set.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support guarding the gaze. Practical barriers help obedience but do not replace repentance or qualified help where needed.",
      },
    ],
    reflectionQuestions: [
      "What temptation is too easy to access?",
      "Which friction step would make obedience easier tonight?",
    ],
    actionSteps: [
      "Add one device or environment barrier.",
      "Tell one trusted person if accountability is needed.",
      "Review the barrier after seven days.",
    ],
    quiz: [
      {
        question: "What is friction for?",
        options: [
          "Making obedience easier and sin less convenient",
          "Pretending personal choice no longer matters",
          "Creating panic around every normal situation",
        ],
        correctAnswer: "Making obedience easier and sin less convenient",
        explanation:
          "Friction supports discipline by changing the environment before the weakest moment.",
      },
    ],
    audioScript:
      "Add friction where sin keeps finding an open door. Make obedience easier and the shortcut less convenient.",
  },
  "lowering-the-gaze-ch-3": {
    subtitle: "Return after slips without turning shame into a spiral",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "A slip should lead to tawbah and repair, not a spiral. Shame often says, you already failed, so keep going. That is a trap. Returning without despair means stopping quickly, asking Allah for forgiveness, removing the trigger, and learning from what happened. Do not let one look become a night of private harm. Do not let a repeated pattern become a secret identity. If the issue is persistent, involve support: accountability, counselling, blocking tools, a trusted mentor, or specialist help. Tawbah is not passive. It includes changing the path that led to the fall and protecting the heart from the next one.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "After a slip, do you usually return quickly, hide in shame, continue the pattern, or make promises without changing the path?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a slip response plan: stop, seek forgiveness, remove the trigger, record the lesson, and contact support if the pattern repeats.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards keep gaze discipline joined to dignity and safe conduct. Persistent harm needs support alongside tawbah.",
      },
    ],
    reflectionQuestions: [
      "What does shame usually tell you after a slip?",
      "Who or what support would help you return faster?",
    ],
    actionSteps: [
      "Write a five-step slip response plan.",
      "Remove one trigger after the next slip.",
      "Seek help for repeated or compulsive patterns.",
    ],
    quiz: [
      {
        question: "What should happen after a slip?",
        options: [
          "Return quickly, remove the trigger, and learn",
          "Keep going because the day is ruined",
          "Hide forever without changing anything",
        ],
        correctAnswer: "Return quickly, remove the trigger, and learn",
        explanation:
          "Tawbah should interrupt the spiral and change the path that led to the slip.",
      },
    ],
    audioScript:
      "After a slip, return quickly. Stop, seek forgiveness, remove the trigger, and do not let shame extend the fall.",
  },
  "lowering-the-gaze-ch-4": {
    subtitle: "Fill the heart so restraint is not only emptiness",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Protecting the heart is not only saying no. It is also filling the heart and life with what makes no easier: prayer, Quran, exercise, halal companionship, purposeful work, service, marriage preparation where relevant, better sleep, and honest emotional support. Many gaze struggles grow stronger when the person is isolated, aimless, overstimulated, or exhausted. Restraint needs a life that can hold it. This chapter should not promise that good habits remove every temptation. They do not. But they give the heart more strength, the body more balance, and the day more direction. A cleaner heart is guarded by what it leaves and what it loves.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What is missing around your gaze struggle: sleep, companionship, worship, exercise, purpose, emotional honesty, or a lawful path forward?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Add one heart-filling habit for seven days: Quran after Fajr, exercise, phone-free walk, service, better bedtime, or a trusted conversation.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor gaze and dignity. Restraint should be supported by worship, healthier routines, and real help when needed.",
      },
    ],
    reflectionQuestions: [
      "What good needs to replace the empty space?",
      "Which lawful support would make restraint more realistic?",
    ],
    actionSteps: [
      "Choose one heart-filling habit.",
      "Reduce one overstimulation source.",
      "Speak to a trusted person if isolation is worsening the struggle.",
    ],
    quiz: [
      {
        question: "Why fill the heart with good?",
        options: [
          "Because restraint is stronger when life has worship and direction",
          "Because temptation will never exist again",
          "Because no boundaries are needed",
        ],
        correctAnswer:
          "Because restraint is stronger when life has worship and direction",
        explanation:
          "Good habits do not remove every test, but they strengthen the heart and make restraint more realistic.",
      },
    ],
    audioScript:
      "Protect the heart by what you leave and what you love. Fill the day with worship, health, purpose, and support.",
  },
  "parents-and-family-ties-ch-1": {
    subtitle: "Honour parents as worship without denying real complexity",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Honouring parents is a serious act of worship, not merely a cultural expectation. The Quranic source card gives the heart a clear direction: speak with care, lower the tone, make dua, and remember mercy. But honour is not a simple slogan for every family situation. Some users carry grief, distance, conversion tension, controlling behaviour, old wounds, or unsafe homes. Start with what is clearly good and safe: respectful speech, dua, service within capacity, checking in, helping with needs, and avoiding contempt. Do not use honour to obey sin, hide abuse, or erase necessary boundaries. Honour should increase mercy and responsibility, not silence harm.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What is one safe form of honour you can practise now: speech, dua, service, patience, financial help, visiting, or reducing contempt?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one small act of honour this week that is real and safe: a call, dua, errand, apology, gentle tone, or practical support.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor parental honour, family kindness, and capacity. Unsafe or coercive situations need trusted support.",
      },
    ],
    reflectionQuestions: [
      "What honour is possible without pretending the family is perfect?",
      "Where do you need mercy without losing safety?",
    ],
    actionSteps: [
      "Choose one safe act of honour.",
      "Make dua for your parents or caregivers.",
      "Seek help where honour is being used to hide harm.",
    ],
    quiz: [
      {
        question: "What should honouring parents include?",
        options: [
          "Mercy, respectful speech, capacity, and safety",
          "Obeying sin or hiding abuse",
          "Contempt whenever family is difficult",
        ],
        correctAnswer: "Mercy, respectful speech, capacity, and safety",
        explanation:
          "Honour is worship, but it should not erase boundaries, safety, or qualified support.",
      },
    ],
    audioScript:
      "Honour parents with mercy, dua, service, and careful speech, while keeping safety and Allah's limits clear.",
  },
  "parents-and-family-ties-ch-2": {
    subtitle: "Set boundaries without turning pain into disrespect",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Boundaries with adab are not rebellion. They are a way to protect rights, worship, safety, and emotional steadiness without turning pain into cruelty. A boundary should be specific: what topic, visit length, money request, phone call, living arrangement, or behaviour needs a limit? It should be worded with dignity where possible: I want to keep our relationship good, so I cannot continue this conversation when there is shouting. Some boundaries need mediation from elders, scholars, counsellors, or legal support. Some situations are unsafe and require distance first. Adab does not mean staying available for harm, and hurt does not give permission to humiliate family.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which boundary needs clearer wording: visits, calls, money, privacy, marriage pressure, worship, criticism, shouting, or old conflict?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one boundary with three parts: the relationship you want, the behaviour you cannot continue, and the safer alternative.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards hold family kindness together with capacity. Boundaries involving harm may need qualified mediation or protection.",
      },
    ],
    reflectionQuestions: [
      "What boundary would protect the relationship from more damage?",
      "What words keep the limit firm without cruelty?",
    ],
    actionSteps: [
      "Write one three-part boundary.",
      "Choose whether mediation is needed.",
      "Prioritise safety where there is threat or coercion.",
    ],
    quiz: [
      {
        question: "What are boundaries with adab for?",
        options: [
          "Protecting rights and safety without cruelty",
          "Punishing family through humiliation",
          "Accepting every harmful behaviour",
        ],
        correctAnswer: "Protecting rights and safety without cruelty",
        explanation:
          "A boundary can be firm, respectful, and protective at the same time.",
      },
    ],
    audioScript:
      "A boundary with adab names the limit, protects safety, and avoids cruelty where mercy is possible.",
  },
  "parents-and-family-ties-ch-3": {
    subtitle: "Make dua for family without trying to control every heart",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Dua for family is an act of love and humility. It recognises that guidance, healing, and soft hearts are not finally in your control. Make dua for parents, siblings, spouses, children, relatives, and difficult family members with honesty: guidance, forgiveness, health, safety, repaired rights, better speech, and protection from harm. Dua does not replace action. If you owe an apology, give it. If there is danger, seek help. If a conversation is needed, prepare it. But dua protects the heart from becoming arrogant, hopeless, or controlling. It lets the user care deeply while admitting that Allah is the Turner of hearts.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which family member do you need to make dua for without trying to control the outcome or rewrite them by force?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write three family duas: one for guidance, one for repair, and one for protection from harm. Repeat them after one prayer today.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect family mercy with capacity. Dua sits beside action, apology, safety planning, and qualified help where needed.",
      },
    ],
    reflectionQuestions: [
      "Where has care become control?",
      "What family repair needs both dua and action?",
    ],
    actionSteps: [
      "Write three family duas.",
      "Take one action that matches one dua.",
      "Release what is not in your control.",
    ],
    quiz: [
      {
        question: "What does dua for family teach?",
        options: [
          "Care with humility and trust in Allah",
          "Control over every heart",
          "Avoiding all real action",
        ],
        correctAnswer: "Care with humility and trust in Allah",
        explanation:
          "Dua protects love from arrogance while still allowing responsible action.",
      },
    ],
    audioScript:
      "Make dua for family with love and humility. Care deeply, act responsibly, and leave hearts with Allah.",
  },
  "parents-and-family-ties-ch-4": {
    subtitle: "Know when family harm needs support beyond private patience",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Some family pain can improve through patience, apology, counselling, mediation, better boundaries, and time. Other harm needs help now: violence, threats, coercive control, forced marriage pressure, child harm, elder abuse, financial exploitation, stalking, severe intimidation, self-harm risk, or being prevented from basic safety. A Muslim app must not use family ties to trap people in danger. The user should make a support map: trusted person, local safeguarding route, emergency services, legal advice, counsellor, qualified scholar, or community organisation depending on the case. Private patience is not a substitute for protection. Mercy and honour do not require silence when people are being harmed.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Is your family difficulty a normal conflict needing adab, or is there harm that requires trusted support and protection?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Create a support map with three contacts or routes: trusted person, professional or safeguarding support, and emergency help if danger appears.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support family kindness and capacity. This chapter explicitly does not advise enduring abuse or danger privately.",
      },
    ],
    reflectionQuestions: [
      "What sign would mean this has moved beyond normal conflict?",
      "Who can help you think clearly without increasing danger?",
    ],
    actionSteps: [
      "Write a three-route support map.",
      "Use emergency help for immediate danger.",
      "Do not force unsafe reconciliation.",
    ],
    quiz: [
      {
        question: "When should family harm be escalated?",
        options: [
          "When safety, coercion, abuse, or serious risk is involved",
          "Never, because family ties require silence",
          "Only after every harm becomes public",
        ],
        correctAnswer:
          "When safety, coercion, abuse, or serious risk is involved",
        explanation:
          "Family ties do not remove the need for protection, safeguarding, and qualified support.",
      },
    ],
    audioScript:
      "Family ties do not require silence in danger. Map trusted support, safeguarding routes, and emergency help where needed.",
  },
  "muslim-identity-in-the-modern-world-ch-1": {
    subtitle: "Root identity in worship before reacting to the world",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Knowing who you are begins before arguments, stereotypes, politics, or pressure to explain yourself. A Muslim identity is rooted in worship of Allah, moral responsibility, mercy, truthfulness, modesty, service, and accountability. That identity should not be reduced to reacting against society, copying trends, or proving worth to people who may never understand. The modern world can pressure a user to become invisible, angry, performative, or confused. A steadier path starts with foundations: prayer, Quran, good company, learning, service, and a clear sense that dignity comes from Allah. This does not remove questions. It gives the user a place to stand while answering them.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What currently shapes your identity most: worship, family, culture, online debate, school, work, politics, fear, trends, or wanting approval?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write a three-line identity anchor: who you worship, what character you want to carry, and one community or family role you will serve well.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect identity to purpose, prophetic example, and safe conduct. This is a foundation, not a culture-war script.",
      },
    ],
    reflectionQuestions: [
      "Where is your identity reacting instead of rooting?",
      "What practice helps you stand steadier as a Muslim?",
    ],
    actionSteps: [
      "Write a three-line identity anchor.",
      "Choose one worship habit that strengthens it.",
      "Reduce one identity-shaping source that feeds confusion.",
    ],
    quiz: [
      {
        question: "Where should Muslim identity be rooted first?",
        options: [
          "Worship, character, service, and accountability to Allah",
          "Approval from every audience",
          "Anger at every question",
        ],
        correctAnswer:
          "Worship, character, service, and accountability to Allah",
        explanation:
          "A rooted identity gives the user a place to stand before responding to modern pressure.",
      },
    ],
    audioScript:
      "Know who you are before the world asks. Root identity in worship, character, service, and accountability to Allah.",
  },
  "muslim-identity-in-the-modern-world-ch-2": {
    subtitle: "Belong with kindness without dissolving your boundaries",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Fitting in without disappearing is a daily skill. Muslims live with neighbours, classmates, colleagues, relatives, and wider society. Good character should make a Muslim trustworthy, useful, and kind. But belonging cannot require dissolving prayer, modesty, halal boundaries, honesty, or conscience. The better question is not, how do I become identical to everyone around me? It is, how can I be present with adab while keeping what Allah has made important? Sometimes this means joining what is good, offering alternatives, explaining calmly, or leaving politely. Sometimes it means enduring being misunderstood. The goal is neither isolation nor imitation. It is principled presence.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where do you feel pressure to disappear: prayer, food, clothing, jokes, relationships, parties, opinions, or hiding that Islam matters?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Prepare one principled presence sentence: I would like to be part of this, but I need to keep this boundary, and here is what I can do instead.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support prophetic example and safe conduct. Personal fiqh boundaries should be learned from qualified sources.",
      },
    ],
    reflectionQuestions: [
      "Where can you join good without compromising?",
      "What alternative could keep both adab and boundaries clear?",
    ],
    actionSteps: [
      "Write one principled presence sentence.",
      "Offer one lawful alternative in a social setting.",
      "Ask qualified guidance where the boundary is unclear.",
    ],
    quiz: [
      {
        question: "What is principled presence?",
        options: [
          "Being kind and useful while keeping Allah's boundaries",
          "Isolation from everyone",
          "Imitating anything to be accepted",
        ],
        correctAnswer: "Being kind and useful while keeping Allah's boundaries",
        explanation:
          "A Muslim can belong with adab without dissolving prayer, modesty, honesty, or conscience.",
      },
    ],
    audioScript:
      "Do not vanish to fit in. Be present with kindness, offer what is good, and keep Allah's boundaries clear.",
  },
  "muslim-identity-in-the-modern-world-ch-3": {
    subtitle:
      "Answer questions without becoming the whole ummah's spokesperson",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Muslims are often asked to explain Islam, defend Muslims, answer political questions, or speak for cultures they do not even belong to. Answering calmly does not mean accepting every burden. A healthy response separates what you know, what you need to check, what is culture, what is personal opinion, and what needs scholarship. It is acceptable to say, I can explain what I understand, but I do not speak for every Muslim. Keep answers short, honest, and grounded in character. Do not be dragged into hostile performances. If a question is sincere, respond with clarity. If it is a trap, choose dignity over winning.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which questions make you feel pressured to answer beyond your knowledge: women, violence, politics, culture, fiqh, history, or current events?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Prepare one honest answer template: what I know, what I need to check, and what I cannot represent for every Muslim.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support prophetic character and safe speech. Complex claims need sources, humility, and qualified scholarship.",
      },
    ],
    reflectionQuestions: [
      "Where do you feel forced to know everything?",
      "How can you answer sincerely without overclaiming?",
    ],
    actionSteps: [
      "Write one honest answer template.",
      "Practise saying, I need to check that.",
      "Leave one hostile performance without needing to win.",
    ],
    quiz: [
      {
        question: "What makes an answer calmer and safer?",
        options: [
          "Honesty about knowledge, limits, and sources",
          "Pretending to know everything",
          "Accepting every hostile framing",
        ],
        correctAnswer: "Honesty about knowledge, limits, and sources",
        explanation:
          "A Muslim can answer with dignity while refusing to overclaim or perform under pressure.",
      },
    ],
    audioScript:
      "You do not speak for every Muslim. Answer what you know, check what you do not, and keep dignity.",
  },
  "muslim-identity-in-the-modern-world-ch-4": {
    subtitle: "Make excellence useful, humble, and connected to Allah",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Muslim excellence is not branding. It is worship expressed through reliability, skill, honesty, service, cleanliness, courage, learning, and mercy. A student can show excellence by refusing cheating. A worker can show it by keeping promises. A founder can show it by telling the truth about a product. A neighbour can show it by being safe and helpful. Excellence should not become perfectionism or public image. The aim is ihsan in the ordinary: doing work carefully, treating people well, protecting salah, and seeking Allah's pleasure even when nobody is watching. Modern Muslim identity becomes stronger when excellence is useful and humble, not loud and hollow.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where could your Islam become visible through excellence this week: punctuality, study, work, cleanliness, service, honesty, or neighbourliness?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one excellence action that benefits someone else and does not need public credit. Complete it within seven days.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect excellence to purpose, prophetic example, and safe conduct. This is about useful character, not image management.",
      },
    ],
    reflectionQuestions: [
      "What would useful excellence look like in your current role?",
      "Where is image pretending to be ihsan?",
    ],
    actionSteps: [
      "Choose one useful excellence action.",
      "Keep one promise more carefully this week.",
      "Do one good deed without public credit.",
    ],
    quiz: [
      {
        question: "What should Muslim excellence become?",
        options: [
          "Useful, humble service connected to Allah",
          "Public image without character",
          "Perfectionism that destroys worship",
        ],
        correctAnswer: "Useful, humble service connected to Allah",
        explanation:
          "Excellence should appear through reliable worship, skill, honesty, service, and mercy.",
      },
    ],
    audioScript:
      "Let excellence be useful and humble: honest work, safe conduct, service, and worship when nobody is watching.",
  },
  "duas-for-hard-days-ch-1": {
    subtitle: "Turn to Allah even when the words feel small",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "On hard days, dua can feel difficult because the heart is tired, numb, ashamed, angry, or unable to form beautiful words. The user should know that turning to Allah does not require a polished speech. A few honest words can be a doorway: help me, guide me, forgive me, strengthen me, protect my family, make the next step clear. Dua is worship because it admits need. It is not a performance. If the hardship involves danger, abuse, self-harm, medical crisis, or severe distress, dua should sit beside immediate human support. Calling on Allah should make the person more honest about need, not more isolated.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What makes dua hard for you today: numbness, shame, anger, tiredness, confusion, fear, or not knowing what to ask?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make one short dua in your own words after the next prayer. Keep it honest enough that you do not need to decorate it.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor dua, reliance, and hope. Urgent safety, medical, or mental-health needs require immediate support too.",
      },
    ],
    reflectionQuestions: [
      "What one sentence would be honest before Allah today?",
      "Where do you need support as well as dua?",
    ],
    actionSteps: [
      "Make one short honest dua.",
      "Write it down if words are difficult.",
      "Contact support if the hardship involves danger or severe distress.",
    ],
    quiz: [
      {
        question: "What does dua require on a hard day?",
        options: [
          "Honest need, not polished performance",
          "Perfect words before turning to Allah",
          "Isolation from all human help",
        ],
        correctAnswer: "Honest need, not polished performance",
        explanation:
          "Dua can begin with simple words and should sit beside real support where needed.",
      },
    ],
    audioScript:
      "When words feel heavy, make a small honest dua. Allah hears need before the sentence sounds beautiful.",
  },
  "duas-for-hard-days-ch-2": {
    subtitle: "Ask for strength without pretending you are self-sufficient",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Asking for strength is not weakness. It is a confession that the servant is not self-sufficient. Hard days may require patience, courage, sleep, medical care, counselling, trusted friends, lawful provision, or a difficult conversation. Dua gathers those needs before Allah and asks for strength to take the next right step. Avoid two extremes: acting as if dua means no effort, or acting as if effort means no need for Allah. Reliance joins the two. A user can ask Allah for strength, then send the message, book the appointment, drink water, rest, apologise, apply for work, or step away from harm.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What kind of strength do you need most today: patience, courage, clarity, rest, restraint, support, forgiveness, or a lawful next step?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Make a strength dua, then pair it with one practical means you can take within your capacity before the day ends.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect dua and tawakkul. Reliance on Allah includes taking responsible means within capacity.",
      },
    ],
    reflectionQuestions: [
      "Where are you pretending you should manage alone?",
      "What practical means belongs beside this dua?",
    ],
    actionSteps: [
      "Name the strength you need.",
      "Make dua for it specifically.",
      "Take one lawful means that matches the dua.",
    ],
    quiz: [
      {
        question: "How should dua for strength be paired?",
        options: [
          "With reliance on Allah and responsible means",
          "With refusing every form of effort",
          "With pretending no help is needed",
        ],
        correctAnswer: "With reliance on Allah and responsible means",
        explanation:
          "Tawakkul joins asking Allah with taking the next lawful step.",
      },
    ],
    audioScript:
      "Ask Allah for strength, then take one lawful means. Reliance is not isolation, and effort is not self-sufficiency.",
  },
  "duas-for-hard-days-ch-3": {
    subtitle: "Let dua move with action instead of replacing it",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Dua and action are not rivals. Dua without action can become avoidance when a clear responsibility is already known. Action without dua can become arrogance when the servant forgets Who controls outcomes. On a hard day, pair each dua with the next responsible step: ask for forgiveness and repair the harm, ask for provision and apply honestly, ask for family healing and speak with adab, ask for safety and contact support, ask for knowledge and study or ask a teacher. The action may be small. It may not fix the whole problem. But it proves the dua is travelling through the limbs, not only the tongue.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which dua needs an action beside it today: apology, appointment, study, boundary, application, rest, charity, or asking for help?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Write one dua-action pair: I ask Allah for this, and the responsible step I can take is this.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor dua and reliance. Action should remain lawful, proportionate, and within capacity.",
      },
    ],
    reflectionQuestions: [
      "Where has dua become a way to delay a known duty?",
      "Where has action made you forget dependence on Allah?",
    ],
    actionSteps: [
      "Write one dua-action pair.",
      "Complete the action before the day ends if possible.",
      "Keep the outcome with Allah after effort.",
    ],
    quiz: [
      {
        question: "How do dua and action work together?",
        options: [
          "Dua admits need, and action takes lawful means",
          "Dua replaces every duty",
          "Action proves Allah is not needed",
        ],
        correctAnswer: "Dua admits need, and action takes lawful means",
        explanation:
          "A believer asks Allah and then moves through lawful, responsible steps.",
      },
    ],
    audioScript:
      "Pair the dua with a step. Ask Allah, then apologise, apply, study, rest, seek help, or repair what you can.",
  },
  "duas-for-hard-days-ch-4": {
    subtitle: "Keep hope when the answer is not visible yet",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Delay can make the heart question whether dua matters. Hope after delay does not mean pretending the wait is painless. It means refusing to decide that Allah has abandoned you because the answer is not visible in the form or timing you wanted. Keep asking, keep taking lawful means, and keep checking whether the dua itself is changing you: more humility, more patience, more honesty, more dependence, more courage to leave sin. Hope is not denial. If the hardship is urgent, dangerous, or medically serious, seek help now. But do not let waiting turn into despair or haram shortcuts.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "What delay is testing your hope, and what temptation appears because of it: despair, envy, anger, giving up effort, or a haram shortcut?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose a seven-day hope plan: keep one dua, take one lawful means, stop one harmful comparison, and seek support if the situation is heavy.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor hope, dua, and tawakkul. Delay should not be used to ignore urgent harm or necessary support.",
      },
    ],
    reflectionQuestions: [
      "What are you tempted to believe because of delay?",
      "What lawful means still remains in your hand?",
    ],
    actionSteps: [
      "Keep one dua for seven days.",
      "Take one lawful means.",
      "Pause one comparison source that weakens hope.",
    ],
    quiz: [
      {
        question: "What does hope after delay require?",
        options: [
          "Keep asking, take lawful means, and avoid despair",
          "Pretend waiting does not hurt",
          "Use haram shortcuts because delay is painful",
        ],
        correctAnswer: "Keep asking, take lawful means, and avoid despair",
        explanation:
          "Hope stays honest about pain while refusing despair and continuing lawful effort.",
      },
    ],
    audioScript:
      "Delay hurts, but it is not abandonment. Keep asking, take lawful means, and guard hope from despair.",
  },
  "the-seerah-starter-path-ch-1": {
    subtitle: "Study seerah to follow, not only to collect stories",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Seerah matters because the Messenger of Allah is not an abstract idea to admire from a distance. His example teaches worship, patience, mercy, courage, trust, truthfulness, community, family conduct, and how revelation was lived under real pressure. A starter path should be humble: learn from reliable sources, separate established teaching from dramatic details, and ask what the lesson should change in your character. Do not use seerah as entertainment only, and do not flatten complex events into quick arguments. This app chapter is not a full biography or a source-critical seerah course. It is a doorway into responsible love, learning, and following.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "When you hear seerah, do you mostly collect facts, feel emotion, win arguments, or ask what should change in your worship and character?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one reliable seerah resource to read slowly. After one section, write one character lesson and one action.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor the prophetic example and safe conduct. Detailed seerah study should use reliable teachers and sources.",
      },
    ],
    reflectionQuestions: [
      "What part of seerah needs to become action, not only information?",
      "Which source or teacher can help you study responsibly?",
    ],
    actionSteps: [
      "Choose one reliable seerah resource.",
      "Write one character lesson after reading.",
      "Avoid sharing dramatic details you cannot verify.",
    ],
    quiz: [
      {
        question: "Why should seerah be studied?",
        options: [
          "To learn and follow prophetic character responsibly",
          "Only to collect dramatic stories",
          "To win every argument online",
        ],
        correctAnswer: "To learn and follow prophetic character responsibly",
        explanation:
          "Seerah should build love, knowledge, worship, character, and careful following.",
      },
    ],
    audioScript:
      "Study seerah to follow, not only to collect stories. Learn responsibly, then turn one lesson into character.",
  },
  "the-seerah-starter-path-ch-2": {
    subtitle: "Learn mercy when pressure would make harshness easy",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Mercy under pressure is one of the hardest parts of prophetic character to imitate. It is easy to admire mercy in a calm lecture and then abandon it when insulted, delayed, misunderstood, tired, or opposed. A seerah starter should ask how the prophetic example trains speech, patience, forgiveness where appropriate, firmness where needed, and concern for people's guidance. Mercy is not weakness, and it is not silence in the face of harm. It is strength held under Allah's guidance. The user can practise this in smaller settings first: family tension, online disagreement, work pressure, or the moment anger asks for a sharp reply.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where does pressure make mercy hardest for you: family, work, online comments, community conflict, traffic, delays, or being misunderstood?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one pressure moment and prepare a mercy response: slower speech, no insult, private correction, a pause, or a firm boundary without cruelty.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards support prophetic example and safe conduct. Mercy should be joined to truth, safety, and appropriate firmness.",
      },
    ],
    reflectionQuestions: [
      "What pressure makes harshness feel justified?",
      "What would mercy look like without becoming weak or unsafe?",
    ],
    actionSteps: [
      "Prepare one mercy response.",
      "Delay one sharp reply.",
      "Use a firm boundary where mercy requires protection.",
    ],
    quiz: [
      {
        question: "What is mercy under pressure?",
        options: [
          "Strength guided by truth, restraint, and care",
          "Never setting boundaries",
          "Harshness whenever anger feels justified",
        ],
        correctAnswer: "Strength guided by truth, restraint, and care",
        explanation:
          "Prophetic mercy is not weakness; it is guided strength with restraint and concern for people.",
      },
    ],
    audioScript:
      "Mercy is tested under pressure. Slow the reply, hold truth with care, and keep boundaries without cruelty.",
  },
  "the-seerah-starter-path-ch-3": {
    subtitle: "Make trust and truthfulness visible in ordinary dealings",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Trust and truthfulness are not only grand virtues for books. They show in ordinary dealings: returning messages, keeping appointments, paying what is owed, describing products honestly, avoiding edited stories, admitting mistakes, protecting secrets, and speaking carefully when angry. Seerah study should make the user's character safer for other people. If people cannot trust your tongue, promises, screenshots, business claims, or private handling of their pain, then admiration has not yet become imitation. This chapter does not need the user to become perfect overnight. It asks for one visible repair: a promise kept, a false claim corrected, a debt recorded, or a confidence protected.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Where is trust most tested for you: time, money, private messages, work claims, family promises, secrets, mistakes, or online presentation?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one trust repair: keep a delayed promise, correct an exaggeration, record an owed payment, apologise, or protect someone's privacy.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards connect prophetic example with safe conduct of tongue and hand. Trust should be visible in practical rights.",
      },
    ],
    reflectionQuestions: [
      "Where do people need you to become more reliable?",
      "What exaggeration or broken promise needs repair?",
    ],
    actionSteps: [
      "Choose one trust repair.",
      "Correct one claim or promise if needed.",
      "Protect one confidence more carefully.",
    ],
    quiz: [
      {
        question: "Where should trust and truthfulness appear?",
        options: [
          "In ordinary promises, speech, money, work, and privacy",
          "Only in speeches about character",
          "Only when people are watching",
        ],
        correctAnswer: "In ordinary promises, speech, money, work, and privacy",
        explanation:
          "Seerah love should become practical reliability and safer conduct.",
      },
    ],
    audioScript:
      "Let seerah become trust: keep promises, tell the truth, protect privacy, and repair what people depend on.",
  },
  "the-seerah-starter-path-ch-4": {
    subtitle: "Carry Sunnah forward through steady character and worship",
    estimatedMinutes: 8,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: "Carrying the Sunnah forward is not only adopting visible symbols or sharing quotes. It is worship, character, mercy, truthfulness, prayer, family conduct, restraint, cleanliness, service, and calling to Allah with wisdom. Visible Sunnah matters, but it should not be separated from the heart and behaviour it is meant to train. A starter path should choose small practices that are reliable: one prayer protected, one speech habit cleaned, one family right fulfilled, one act of service, one reliable seerah lesson studied. Do not claim scholarship because you love the Sunnah. Let love create humility, learning, and a life that makes the prophetic example easier to recognise.",
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Which Sunnah-facing habit should become steadier in your life: prayer, speech, mercy, service, family conduct, cleanliness, learning, or restraint?",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one Sunnah practice for seven days and pair it with one character repair so the visible and inner practice grow together.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards anchor prophetic example and safe conduct. Detailed Sunnah and fiqh questions should be learned from qualified teachers.",
      },
    ],
    reflectionQuestions: [
      "Where has visible practice become separated from character?",
      "What small Sunnah practice can you keep reliably?",
    ],
    actionSteps: [
      "Choose one seven-day Sunnah practice.",
      "Pair it with one character repair.",
      "Study one reliable seerah or Sunnah lesson slowly.",
    ],
    quiz: [
      {
        question: "How should the Sunnah be carried forward?",
        options: [
          "Through worship, character, mercy, learning, and humility",
          "Only through visible symbols without conduct",
          "By claiming scholarship quickly",
        ],
        correctAnswer:
          "Through worship, character, mercy, learning, and humility",
        explanation:
          "Love of the Sunnah should produce steady worship, safer character, and humble learning.",
      },
    ],
    audioScript:
      "Carry the Sunnah through worship and character. Pair visible practice with mercy, truthfulness, learning, and humility.",
  },
};

function makeChapter(
  bookId: string,
  index: number,
  title: string,
  theme: LibraryCategory,
): Chapter {
  const chapterId = `${bookId}-ch-${index}`;
  const chapter: Chapter = {
    id: chapterId,
    title,
    subtitle: `${theme} in a practical, calm, source-first way`,
    estimatedMinutes: 5,
    sections: [
      {
        type: "lesson",
        heading: "Learn",
        body: chapterLessonBody(title, theme),
      },
      {
        type: "reflection",
        heading: "Reflect",
        body: "Choose one real situation where this lesson is already being tested. Notice the pressure in that moment, the excuse that usually sounds convincing, and the quality Allah may be training in you through this practice.",
      },
      {
        type: "action",
        heading: "Act",
        body: "Choose one action small enough to complete today and clear enough to review tomorrow: a dua, a repaired message, a protected prayer, a cleaner phone setting, a page of Quran with meaning, or a short act of service.",
      },
      {
        type: "source",
        heading: "Source connection",
        body: "The source cards below keep the lesson tied to Quran or hadith evidence. They support reflection and action while still leaving sensitive rulings, personal cases, and madhhab-specific details for qualified scholarship.",
      },
    ],
    reflectionQuestions: [
      `Where does ${title.toLowerCase()} most clearly appear in your current routine?`,
      "What pressure, habit, or assumption makes this subject harder to live well?",
    ],
    actionSteps: [
      "Write one intention before your next task.",
      "Mark the lesson complete after you do the action once.",
    ],
    quiz: [
      {
        question: "How should a user apply this chapter after reading it?",
        options: [
          "Choose one clear action and review it honestly",
          "Treat it as a final fatwa for every situation",
          "Ignore the source cards and rely on motivation",
        ],
        correctAnswer: "Choose one clear action and review it honestly",
        explanation:
          "The library is designed for source-anchored learning, practical action, and careful review. Sensitive cases still need qualified scholarship.",
      },
    ],
    sourceRefs: verifiedSourcesForTopic(bookId, chapterId, title, theme),
    audioScript: `In ${title}, connect the idea to the source cards, name one real situation, and choose a careful action that can be reviewed with honesty and hope.`,
  };
  return {
    ...chapter,
    ...(CHAPTER_CONTENT_OVERRIDES[chapterId] || {}),
    sourceRefs: chapter.sourceRefs,
  };
}

function makeBook(params: {
  title: string;
  subtitle: string;
  description: string;
  category: LibraryCategory;
  requiredPlan: PlanType;
  difficulty?: "beginner" | "intermediate" | "advanced";
  coverVariant?: Book["coverVariant"];
  tags?: string[];
  featured?: boolean;
  recommended?: boolean;
  chapters: string[];
}): Book {
  const id = slug(params.title);
  const chapters = params.chapters.map((title, index) =>
    makeChapter(id, index + 1, title, params.category),
  );
  const coverVariant = params.coverVariant ?? "emerald";
  const reviewMetadata = reviewMetadataForBook(id, "scholar_review_ready");
  return {
    id,
    title: params.title,
    subtitle: params.subtitle,
    description: params.description,
    authorName: NURAI_BOOK_AUTHOR,
    provenanceLabel: NURAI_BOOK_PROVENANCE,
    contentOrigin: NURAI_CONTENT_ORIGIN,
    category: params.category,
    difficulty: params.difficulty ?? "beginner",
    estimatedMinutes: chapters.reduce(
      (sum, chapter) => sum + chapter.estimatedMinutes,
      0,
    ),
    requiredPlan: params.requiredPlan,
    previewChapterIds: [chapters[0]?.id].filter(Boolean) as string[],
    coverVariant,
    coverDesign: coverDesignForBook({
      id,
      title: params.title,
      category: params.category,
      coverVariant,
      verifiedContentStatus: reviewMetadata.verifiedContentStatus,
    }),
    chapters,
    tags: params.tags ?? [],
    featured: params.featured,
    recommended: params.recommended,
    safetyNote:
      "Educational learning path with verified Quran or hadith source anchors. Chapter commentary is ready for scholar review before being treated as final. Sensitive fiqh, marriage, medical, legal, and personal cases still require a qualified scholar.",
    ...reviewMetadata,
  };
}

const ruhFocusChapterTitles = [
  "The Ruh, the Nafs and the Qalb",
  "Purpose, Qadr and Freedom",
  "Time as Amanah",
  "Sin, Shame and the Psychology of Addiction",
  "Decision Rules for the Modern Muslim",
  "Building Discipline through Faith",
  "Habits of the Five Pillars",
  "The Warrior Routine: Mind, Body and Spirit",
  "Wealth, Work and Worship",
  "Brotherhood and Boundaries",
  "Real World Survival",
  "Marriage, Love and Leadership",
  "Patience, Pain and Mental Strength",
  "Fighting Sin and Spiritual Addiction",
  "The Modern World vs The Muslim Mind",
  "Vision and Mission",
  "The Scholar and the Soldier Within",
  "Walking Among People, Thinking of Jannah",
  "Becoming a Light for Others",
  "The Final Sujud",
];

const ruhFocusChapters: Chapter[] = ruhFocusChapterTitles.map(
  (title, index) => {
    const bookId = "ruh-focus";
    const chapterId = `${bookId}-ch-${index + 1}`;
    const chapter: Chapter = {
      id: chapterId,
      title,
      subtitle: "Discipline, purpose and spiritual strength in daily life",
      estimatedMinutes: 6,
      sections: [
        {
          type: "lesson",
          heading: "Learn",
          body: ruhFocusLessonBody(title, index),
        },
        {
          type: "reflection",
          heading: "Reflect",
          body: "The aim is not shame. The aim is awareness. Users should leave each chapter knowing what pulled them away, what brought them back, and what they can do next with sincerity.",
        },
        {
          type: "action",
          heading: "Act",
          body: "Select one concrete practice for today: a short dhikr, a sincere apology, a blocked distraction, a written intention, or one page of Quran read with meaning. Keep it private enough to protect sincerity and clear enough to review.",
        },
        {
          type: "source",
          heading: "Review",
          body: "Use the verified source cards below as anchors for reflection. Ruh Focus remains a learning guide, not a fatwa, and sensitive personal rulings still need qualified scholarship.",
        },
      ],
      reflectionQuestions: [
        "What is one moment today where your nafs was louder than your ruh?",
        "What is one small action that would let your heart lead next time?",
      ],
      actionSteps: [
        "Write one sentence intention for tomorrow.",
        "Complete one private act of worship without telling anyone.",
      ],
      quiz: [
        {
          question: "What is the safest way to use this chapter?",
          options: [
            "As guided reflection with source anchors",
            "As a final legal ruling",
            "As a replacement for scholars",
          ],
          correctAnswer: "As guided reflection with source anchors",
          explanation:
            "The chapter can guide reflection and action, while sensitive Islamic rulings still need qualified scholarship.",
        },
      ],
      sourceRefs: verifiedSourcesForTopic(
        bookId,
        chapterId,
        title,
        "Self-Discipline",
      ),
      audioScript: `Ruh Focus, chapter ${index + 1}: ${title}. Listen slowly, choose one action, and let the lesson become a lived habit.`,
    };

    return {
      ...chapter,
      ...(CHAPTER_CONTENT_OVERRIDES[chapterId] || {}),
    };
  },
);

const ruhFocusReviewMetadata = reviewMetadataForBook(
  "ruh-focus",
  "scholar_review_ready",
);

export const RUH_FOCUS_BOOK: Book = {
  id: "ruh-focus",
  title: "Ruh Focus",
  subtitle: "Discipline, purpose, and spiritual strength for the modern Muslim",
  description:
    "A premium interactive edition of Hamid Amjad's Ruh Focus: spiritual discipline, habit repair, work, family, brotherhood, purpose and the final return to Allah.",
  authorName: NURAI_BOOK_AUTHOR,
  provenanceLabel: NURAI_BOOK_PROVENANCE,
  contentOrigin: NURAI_CONTENT_ORIGIN,
  category: "Self-Discipline",
  difficulty: "intermediate",
  estimatedMinutes: ruhFocusChapters.reduce(
    (sum, chapter) => sum + chapter.estimatedMinutes,
    0,
  ),
  requiredPlan: "premium",
  previewChapterIds: ["ruh-focus-ch-1"],
  coverVariant: "gold",
  coverDesign: coverDesignForBook({
    id: "ruh-focus",
    title: "Ruh Focus",
    category: "Self-Discipline",
    coverVariant: "gold",
    verifiedContentStatus: ruhFocusReviewMetadata.verifiedContentStatus,
  }),
  chapters: ruhFocusChapters,
  tags: ["discipline", "purpose", "habits", "modern life", "heart training"],
  featured: true,
  recommended: true,
  safetyNote:
    "Original user-authored book adapted for NurAI with verified Quran or hadith source anchors. Commentary should be reviewed before being treated as final scholarship. Sensitive rulings still require a qualified scholar.",
  ...ruhFocusReviewMetadata,
};

export const LIBRARY_BOOKS: Book[] = [
  RUH_FOCUS_BOOK,
  makeBook({
    title: "Understand Surah Al-Fatihah",
    subtitle: "Bring meaning back into every salah",
    description:
      "A gentle word-by-word reflection path for the surah every Muslim repeats daily.",
    category: "Quran",
    requiredPlan: "free",
    coverVariant: "emerald",
    featured: true,
    tags: ["quran", "salah", "fatihah"],
    chapters: [
      "Why Al-Fatihah Opens the Quran",
      "The Names of Mercy",
      "Understand Worship and Seeking Help",
      "The Straight Path",
    ],
  }),
  makeBook({
    title: "Quranic Arabic Starter",
    subtitle: "Learn the words you already recite",
    description:
      "A beginner Quran Arabic path focused on high-frequency words, roots and prayer vocabulary.",
    category: "Arabic",
    requiredPlan: "premium",
    coverVariant: "blue",
    tags: ["arabic", "quran words", "vocabulary"],
    chapters: [
      "How Quranic Arabic Works",
      "The Words of Salah",
      "Starter Roots and Patterns",
      "Reading With Meaning",
    ],
  }),
  makeBook({
    title: "Root Words of the Quran",
    subtitle: "See meaning through Arabic roots",
    description:
      "A Scholar path for users ready to study Quran vocabulary with more structure.",
    category: "Arabic",
    requiredPlan: "scholar",
    difficulty: "advanced",
    coverVariant: "gold",
    tags: ["roots", "sarf", "scholar"],
    chapters: [
      "What a Root Reveals",
      "Mercy and Guidance Roots",
      "Worship and Obedience Roots",
      "Building a Root Notebook",
    ],
  }),
  makeBook({
    title: "Khushu in Salah",
    subtitle: "Return presence to prayer",
    description:
      "A practical guide to attention, preparation, meaning and calm in salah.",
    category: "Worship",
    requiredPlan: "premium",
    coverVariant: "emerald",
    tags: ["salah", "khushu", "focus"],
    chapters: [
      "Arrive Before You Begin",
      "Understand What You Say",
      "Guard the First Takbir",
      "After Salah Reflection",
    ],
  }),
  makeBook({
    title: "Wudu and Purification",
    subtitle: "Learn cleanliness with confidence",
    description:
      "A clear beginner guide to purification with careful notes for madhhab-sensitive details.",
    category: "Worship",
    requiredPlan: "free",
    tags: ["wudu", "purification", "beginner"],
    chapters: [
      "Why Purification Matters",
      "Wudu Step by Step",
      "Common Mistakes",
      "When to Ask a Scholar",
    ],
  }),
  makeBook({
    title: "The Muslim Morning Routine",
    subtitle: "Start the day with intention",
    description:
      "A daily system for Fajr, Quran, dhikr, planning and disciplined work.",
    category: "Self-Discipline",
    requiredPlan: "free",
    coverVariant: "emerald",
    recommended: true,
    tags: ["morning", "routine", "habits"],
    chapters: [
      "Wake With Intention",
      "Fajr as Anchor",
      "Ten Minutes of Quran",
      "Plan Your Amanah",
    ],
  }),
  makeBook({
    title: "Quitting Bad Habits",
    subtitle: "A merciful system for leaving sins",
    description:
      "Practical Islamic habit change for users fighting private struggles without despair.",
    category: "Youth & Modern Struggles",
    requiredPlan: "premium",
    coverVariant: "rose",
    tags: ["habits", "repentance", "discipline"],
    chapters: [
      "Start Quitting by Naming the Loop",
      "Remove the Trigger",
      "Replace the Reward",
      "Return After Slips",
    ],
  }),
  makeBook({
    title: "Dua and Tawakkul",
    subtitle: "Ask, act and rely on Allah",
    description:
      "A hopeful guide to making dua, trusting Allah and acting responsibly.",
    category: "Duas & Dhikr",
    requiredPlan: "free",
    coverVariant: "emerald",
    tags: ["dua", "tawakkul", "hope"],
    chapters: [
      "Dua Is Worship",
      "Ask With Presence",
      "Tie the Camel",
      "When the Answer Takes Time",
    ],
  }),
  makeBook({
    title: "Daily Dhikr Reset",
    subtitle: "Use remembrance to steady the heart",
    description:
      "A practical dhikr path for mornings, evenings, stress and gratitude.",
    category: "Duas & Dhikr",
    requiredPlan: "premium",
    tags: ["dhikr", "heart", "stress"],
    chapters: [
      "Remember Before the Noise",
      "Morning and Evening Anchors",
      "Dhikr Under Pressure",
      "Build a Personal Wird",
    ],
  }),
  makeBook({
    title: "Marriage With Mercy",
    subtitle: "Communication, patience and rights with care",
    description:
      "A family guide with strong safety boundaries and qualified-scholar reminders for fiqh details.",
    category: "Family",
    requiredPlan: "premium",
    coverVariant: "rose",
    tags: ["marriage", "family", "mercy"],
    chapters: [
      "Mercy Before Ego",
      "Listening Without Winning",
      "Rights Need Knowledge",
      "When to Seek Help",
    ],
  }),
  makeBook({
    title: "Raising Children Upon Islam",
    subtitle: "A parent path for faith, character and routine",
    description:
      "Gentle family learning around stories, prayer, Quran and emotional safety.",
    category: "Family",
    requiredPlan: "premium",
    tags: ["children", "parenting", "family"],
    chapters: [
      "Raising Through What You Model",
      "Make Salah Familiar",
      "Stories and Character",
      "Protect Without Panic",
    ],
  }),
  makeBook({
    title: "Character and Manners",
    subtitle: "Adab that people can feel",
    description:
      "A practical path for honesty, humility, speech and reliability.",
    category: "Character",
    requiredPlan: "free",
    coverVariant: "slate",
    tags: ["adab", "character", "manners"],
    chapters: [
      "Truthfulness in Small Things",
      "Guarding the Tongue",
      "Humility in Wins",
      "Reliability as Worship",
    ],
  }),
  makeBook({
    title: "Controlling Anger",
    subtitle: "Slow the fire before it harms",
    description:
      "A calm anger-management guide rooted in self-awareness and Islamic manners.",
    category: "Character",
    requiredPlan: "premium",
    coverVariant: "rose",
    tags: ["anger", "patience", "family"],
    chapters: [
      "Controlling the First Heat",
      "Pause the Tongue",
      "Repair Quickly",
      "Build a Cooler Environment",
    ],
  }),
  makeBook({
    title: "Halal Wealth and Work",
    subtitle: "Earn with integrity and purpose",
    description:
      "A work and wealth guide for ambition, halal income, sadaqah and responsibility.",
    category: "Wealth & Work",
    requiredPlan: "premium",
    coverVariant: "gold",
    tags: ["wealth", "work", "halal"],
    chapters: [
      "Rizq and Effort",
      "Integrity at Work",
      "Avoiding Doubtful Paths",
      "Giving From What You Love",
    ],
  }),
  makeBook({
    title: "Business With Barakah",
    subtitle: "A Muslim founder's ethical operating system",
    description:
      "A high-performance business guide with faith, service and lawful boundaries.",
    category: "Wealth & Work",
    requiredPlan: "scholar",
    difficulty: "advanced",
    coverVariant: "gold",
    tags: ["business", "barakah", "work"],
    chapters: [
      "Intention in Enterprise",
      "Fair Contracts",
      "Customer Trust",
      "Profit and Accountability",
    ],
  }),
  makeBook({
    title: "New Muslim Starter Guide",
    subtitle: "Learn Islam without overwhelm",
    description:
      "A first path for new Muslims: belief, prayer, Quran, community and gentle next steps.",
    category: "Reverts",
    requiredPlan: "free",
    coverVariant: "emerald",
    featured: true,
    tags: ["new muslim", "revert", "beginner"],
    chapters: [
      "Welcome to Islam",
      "Starter Steps: What to Learn First",
      "First Steps in Prayer",
      "Family and Community Pressure",
    ],
  }),
  makeBook({
    title: "Explaining Islam to Family",
    subtitle: "Speak with clarity and mercy",
    description:
      "A support guide for new Muslims navigating family conversations.",
    category: "Reverts",
    requiredPlan: "premium",
    tags: ["family", "new muslim", "communication"],
    chapters: [
      "Lower the Temperature",
      "Explaining With Simplicity",
      "Respect Without Compromise",
      "When Silence Is Wise",
    ],
  }),
  makeBook({
    title: "Ramadan Preparation",
    subtitle: "Enter Ramadan before Ramadan enters",
    description:
      "A step-by-step plan for Quran, fasting, dua, charity and the last ten nights.",
    category: "Ramadan",
    requiredPlan: "free",
    coverVariant: "emerald",
    tags: ["ramadan", "fasting", "quran"],
    chapters: [
      "Prepare the Heart",
      "Design Your Quran Plan",
      "Charity and Dua",
      "Last Ten Nights",
    ],
  }),
  makeBook({
    title: "The Last Ten Nights",
    subtitle: "A focused plan for worship and dua",
    description:
      "A premium Ramadan guide for worship blocks, family balance and sincere dua.",
    category: "Ramadan",
    requiredPlan: "premium",
    coverVariant: "gold",
    tags: ["laylatul qadr", "ramadan", "dua"],
    chapters: [
      "Protect the Nights",
      "A Dua List That Matters",
      "Quran and Qiyam",
      "Eid Without Spiritual Drop",
    ],
  }),
  makeBook({
    title: "Hifz Foundations",
    subtitle: "Memorise Quran with calm structure",
    description:
      "A beginner memorisation system for revision, new ayat and consistency.",
    category: "Hifz",
    requiredPlan: "free",
    tags: ["hifz", "quran", "memorisation"],
    chapters: [
      "Choose a Sustainable Pace",
      "Listen Before Memorising",
      "Review More Than You Add",
      "Track Weak Ayat",
    ],
  }),
  makeBook({
    title: "Advanced Hifz Review",
    subtitle: "Protect what Allah helped you memorise",
    description:
      "A deeper review strategy for weak passages, mistakes and long-term maintenance.",
    category: "Hifz",
    requiredPlan: "premium",
    coverVariant: "blue",
    tags: ["hifz", "revision", "analytics"],
    chapters: [
      "Diagnose Weakness",
      "Spaced Repetition",
      "Mistake Logs",
      "Monthly Khatm Review",
    ],
  }),
  makeBook({
    title: "Remembering Death and Akhirah",
    subtitle: "Live with the end in sight",
    description:
      "A reflective path on purpose, repentance and the temporary nature of dunya.",
    category: "Akhirah",
    requiredPlan: "premium",
    coverVariant: "slate",
    tags: ["akhirah", "death", "purpose"],
    chapters: [
      "The Shortness of Life",
      "Repentance Today",
      "Akhirah in Decisions",
      "Leaving Good Behind",
    ],
  }),
  makeBook({
    title: "Purpose Beyond Dunya",
    subtitle: "Use ambition without becoming owned by it",
    description:
      "A serious path for users trying to align goals, career and worship.",
    category: "Akhirah",
    requiredPlan: "premium",
    tags: ["purpose", "ambition", "akhirah"],
    chapters: [
      "What Are You Building?",
      "Ambition as Amanah",
      "Status and Sincerity",
      "Measure What Lasts",
    ],
  }),
  makeBook({
    title: "Social Media Discipline",
    subtitle: "Protect attention, modesty and the heart",
    description:
      "A modern struggle guide for scrolling, comparison, lowering the gaze and time loss.",
    category: "Youth & Modern Struggles",
    requiredPlan: "premium",
    coverVariant: "purple",
    tags: ["social media", "attention", "modesty"],
    chapters: [
      "The Attention Trap",
      "Comparison and Envy",
      "Lowering the Gaze Online",
      "Build a Cleaner Feed",
    ],
  }),
  makeBook({
    title: "Lowering the Gaze",
    subtitle: "A practical path to dignity and self-control",
    description:
      "A careful guide for desire, triggers, repentance and rebuilding discipline.",
    category: "Youth & Modern Struggles",
    requiredPlan: "premium",
    coverVariant: "rose",
    tags: ["gaze", "discipline", "modesty"],
    chapters: [
      "Lowering the First Trigger",
      "Design Friction",
      "Return Without Despair",
      "Protect the Heart",
    ],
  }),
  makeBook({
    title: "Anxiety, Sabr and Tawakkul",
    subtitle: "Spiritual steadiness in hardship",
    description:
      "A gentle guide for worry, sadness and daily coping, with clear mental-health boundaries.",
    category: "Character",
    requiredPlan: "free",
    tags: ["anxiety", "sabr", "tawakkul"],
    chapters: [
      "Name the Weight",
      "Sabr Is Active",
      "Tawakkul With Action",
      "When to Seek Support",
    ],
  }),
  makeBook({
    title: "Repentance and Returning",
    subtitle: "Come back without pretending you never fell",
    description:
      "A hopeful path for tawbah, repair, triggers and consistency after slips.",
    category: "Self-Discipline",
    requiredPlan: "free",
    coverVariant: "emerald",
    tags: ["repentance", "hope", "habits"],
    chapters: [
      "Do Not Delay Return",
      "Regret Without Despair",
      "Repair What You Can",
      "Build Protection",
    ],
  }),
  makeBook({
    title: "Parents and Family Ties",
    subtitle: "Mercy, boundaries and service",
    description:
      "A guide to honouring parents while navigating difficulty with wisdom.",
    category: "Family",
    requiredPlan: "premium",
    tags: ["parents", "family", "boundaries"],
    chapters: [
      "Honour Is Worship",
      "Boundaries With Adab",
      "Dua for Family",
      "When Harm Needs Help",
    ],
  }),
  makeBook({
    title: "Muslim Identity in the Modern World",
    subtitle: "Be clear without becoming harsh",
    description:
      "A balanced path for confidence, belonging, values and public life.",
    category: "Youth & Modern Struggles",
    requiredPlan: "premium",
    coverVariant: "blue",
    tags: ["identity", "modern life", "confidence"],
    chapters: [
      "Know Who You Are",
      "Fit In Without Disappearing",
      "Answer Questions Calmly",
      "Build Muslim Excellence",
    ],
  }),
  makeBook({
    title: "Islam for Curious Non-Muslims",
    subtitle: "A respectful introduction",
    description:
      "A simple, non-aggressive path explaining belief, Quran, worship and Muslim life.",
    category: "Reverts",
    requiredPlan: "free",
    coverVariant: "slate",
    tags: ["non muslim", "intro", "belief"],
    chapters: [
      "What Muslims Believe",
      "What Is the Quran?",
      "Why Muslims Pray",
      "How to Visit a Mosque",
    ],
  }),
  makeBook({
    title: "Women in Islam: A Careful Introduction",
    subtitle: "Clarity, dignity and source-first learning",
    description:
      "An introductory guide with source anchors and qualified-scholar reminders for sensitive questions.",
    category: "Family",
    requiredPlan: "scholar",
    difficulty: "advanced",
    coverVariant: "rose",
    tags: ["women", "family", "scholar"],
    chapters: [
      "Dignity and Worship",
      "Learning Before Assumptions",
      "Common Questions",
      "When a Scholar Is Needed",
    ],
  }),
  makeBook({
    title: "Salah for Absolute Beginners",
    subtitle: "Learn prayer step by step",
    description:
      "A starter book for users who need the prayer shape, meaning and confidence.",
    category: "Worship",
    requiredPlan: "free",
    tags: ["salah", "beginner", "new muslim"],
    chapters: [
      "Absolute Basics Before You Pray",
      "The Shape of Salah",
      "What You Say",
      "Your First Week",
    ],
  }),
  makeBook({
    title: "Sunnah Prayers and Daily Extras",
    subtitle: "Add worship without burning out",
    description: "A guided path for voluntary prayers and sustainable growth.",
    category: "Worship",
    requiredPlan: "premium",
    tags: ["sunnah", "prayer", "worship"],
    chapters: [
      "Why Daily Voluntary Worship Matters",
      "Start With Two Rak'at",
      "Protect Witr",
      "Grow Slowly",
    ],
  }),
  makeBook({
    title: "Duas for Hard Days",
    subtitle: "Turn pain into conversation with Allah",
    description:
      "A guided reflection book for grief, stress, fear, loneliness and hope.",
    category: "Duas & Dhikr",
    requiredPlan: "premium",
    coverVariant: "purple",
    tags: ["dua", "hardship", "hope"],
    chapters: [
      "When Words Feel Heavy",
      "Ask for Strength",
      "Dua and Action",
      "Hope After Delay",
    ],
  }),
  makeBook({
    title: "Charity and Sadaqah",
    subtitle: "Build generosity into your normal life",
    description:
      "A practical giving plan for money, service, family and community.",
    category: "Wealth & Work",
    requiredPlan: "free",
    tags: ["charity", "sadaqah", "wealth"],
    chapters: [
      "Give Before It Feels Easy",
      "Small Daily Charity",
      "Serve With Time",
      "Make Giving Automatic",
    ],
  }),
  makeBook({
    title: "Zakat With Confidence",
    subtitle: "Understand the basics and know when to ask",
    description:
      "A source-first primer for zakat concepts with clear complex-asset disclaimers.",
    category: "Wealth & Work",
    requiredPlan: "premium",
    tags: ["zakat", "wealth", "fiqh"],
    chapters: [
      "What Zakat Purifies",
      "Assets and Debts",
      "Nisab and Hawl",
      "Complex Cases Need Scholars",
    ],
  }),
  makeBook({
    title: "Hajj and Umrah Preparation",
    subtitle: "A calm guide before the journey",
    description:
      "A learning path for intention, rites, adab and practical preparation.",
    category: "Worship",
    requiredPlan: "premium",
    coverVariant: "gold",
    tags: ["hajj", "umrah", "worship"],
    chapters: [
      "Intention Before Travel",
      "Learn the Rites",
      "Patience in Crowds",
      "Returning Changed",
    ],
  }),
  makeBook({
    title: "The Seerah Starter Path",
    subtitle: "Know the Prophet's life with love and clarity",
    description:
      "A beginner-friendly path through major lessons from the Prophet's life.",
    category: "Character",
    requiredPlan: "premium",
    tags: ["seerah", "prophet", "character"],
    chapters: [
      "Why Seerah Matters",
      "Mercy Under Pressure",
      "Trust and Truthfulness",
      "Carry the Sunnah Forward",
    ],
  }),
  makeBook({
    title: "Hadith in Daily Life",
    subtitle: "Practise one teaching at a time",
    description:
      "A source-engine-ready path for turning verified hadith into daily action.",
    category: "Character",
    requiredPlan: "scholar",
    difficulty: "advanced",
    coverVariant: "gold",
    tags: ["hadith", "practice", "scholar"],
    chapters: [
      "Never Quote Carelessly",
      "From Source to Practice",
      "Grades and Context",
      "Build a Hadith Habit",
    ],
  }),
  makeBook({
    title: "Fiqh Foundations Without Overwhelm",
    subtitle: "Know what needs scholarship",
    description:
      "A Scholar path explaining why rulings need sources, context and qualified teachers.",
    category: "Worship",
    requiredPlan: "scholar",
    difficulty: "advanced",
    coverVariant: "gold",
    tags: ["fiqh", "madhhab", "scholar"],
    chapters: [
      "Fiqh Foundations: What Fiqh Is",
      "Why Scholars Differ Without Overwhelm",
      "Madhhab Awareness",
      "How to Ask Better Questions",
    ],
  }),
  makeBook({
    title: "Children's Iman Builder",
    subtitle: "A parent-friendly learning path",
    description:
      "Simple family lessons for Allah, prayer, gratitude, kindness and Quran love.",
    category: "Family",
    requiredPlan: "premium",
    coverVariant: "emerald",
    tags: ["kids", "parenting", "iman"],
    chapters: [
      "Be an Iman Builder at Home",
      "Allah Loves Goodness",
      "Little Salah Moments",
      "Celebrate Character",
    ],
  }),
  makeBook({
    title: "Brotherhood and Sisterhood",
    subtitle: "Build community with boundaries",
    description:
      "A social guide for friendship, trust, privacy, service and avoiding drama.",
    category: "Character",
    requiredPlan: "premium",
    tags: ["community", "friendship", "boundaries"],
    chapters: [
      "Choose Good Company",
      "Serve Quietly",
      "Avoid Backbiting",
      "Repair Brotherhood",
    ],
  }),
  makeBook({
    title: "A Muslim Student's Path",
    subtitle: "Study, faith and focus",
    description:
      "A practical path for school, exams, friends, prayer and digital discipline.",
    category: "Youth & Modern Struggles",
    requiredPlan: "premium",
    coverVariant: "blue",
    tags: ["student", "focus", "youth"],
    chapters: [
      "Study as Amanah",
      "Prayer Between Classes",
      "Friends and Influence",
      "Exams With Tawakkul",
    ],
  }),
  makeBook({
    title: "The Quiet Power of Sabr",
    subtitle: "Patience that still takes action",
    description:
      "A deep but gentle path for endurance, grief, waiting and hope.",
    category: "Akhirah",
    requiredPlan: "premium",
    coverVariant: "slate",
    tags: ["sabr", "grief", "hope"],
    chapters: [
      "Quiet Power Is Not Passivity",
      "Hold the Tongue",
      "Keep the Prayer",
      "Hope While Waiting",
    ],
  }),
  makeBook({
    title: "Daily Quran Companion",
    subtitle: "Read, reflect, and live one ayah at a time",
    description:
      "A premium guided Quran companion for building daily recitation, reflection, source-aware questions and action.",
    category: "Quran",
    requiredPlan: "premium",
    coverVariant: "emerald",
    featured: true,
    recommended: true,
    tags: ["quran", "reflection", "daily study"],
    chapters: [
      "Your Daily Quran Companion",
      "Read, Listen, and Reflect Daily",
      "One Quran Ayah That Changes the Day",
      "Build a Companion Tafsir Question",
      "Protect a Daily Quran Appointment",
      "Carry the Quran Meaning Into Action",
    ],
  }),
  makeBook({
    title: "Names of Allah for Daily Life",
    subtitle: "Turn knowledge into dua, hope, and action",
    description:
      "A practical names-of-Allah study book that connects remembrance, dua, gratitude and steadiness to daily situations.",
    category: "Duas & Dhikr",
    requiredPlan: "premium",
    coverVariant: "gold",
    recommended: true,
    tags: ["names of Allah", "dua", "dhikr"],
    chapters: [
      "Begin With Ar-Rahman",
      "Call Upon Allah by His Names Daily",
      "Daily Names in Hardship",
      "Daily Names in Gratitude",
      "Turn Knowledge Into Dua",
    ],
  }),
  makeBook({
    title: "Jumuah Reset",
    subtitle: "Let Friday renew your week",
    description:
      "A concise Friday study guide for ghusl, masjid adab, khutbah attention, dua, and a weekly spiritual reset.",
    category: "Worship",
    requiredPlan: "free",
    coverVariant: "blue",
    tags: ["jumuah", "friday", "worship"],
    chapters: [
      "Jumuah Reset Before Friday",
      "Arrive Before the Jumuah Khutbah",
      "Listen With Jumuah Adab",
      "Jumuah Dua and Salawat",
      "Plan the Weekly Reset After Jumuah",
    ],
  }),
  makeBook({
    title: "Masjid Etiquette",
    subtitle: "Enter Allah's houses with adab",
    description:
      "A beginner-friendly masjid manners book covering cleanliness, quietness, rows, community care and welcoming new people.",
    category: "Character",
    requiredPlan: "free",
    coverVariant: "slate",
    tags: ["masjid", "adab", "community"],
    chapters: [
      "Masjid Etiquette in Allah's Houses",
      "Cleanliness and Quietness With Adab",
      "Rows, Space, and Community Care",
      "Welcoming New People With Mercy",
      "Leave the Masjid Better Than You Came",
    ],
  }),
  makeBook({
    title: "Phone Detox for the Muslim Heart",
    subtitle: "Win back attention, time, and purity",
    description:
      "A modern attention-repair book for users who want less scrolling, cleaner feeds, stronger salah, and more presence.",
    category: "Youth & Modern Struggles",
    requiredPlan: "premium",
    coverVariant: "purple",
    recommended: true,
    tags: ["phone detox", "attention", "discipline"],
    chapters: [
      "Phone Detox: Win Back Attention",
      "Detox the Scrolling Trigger Path",
      "Replace Empty Time With Purity",
      "Protect Salah and Presence From Notifications",
      "Build Cleaner Feeds and Digital Rules",
    ],
  }),
  makeBook({
    title: "The Muslim Teen Survival Guide",
    subtitle: "Faith, friends, school, pressure, and identity",
    description:
      "A serious but warm guide for Muslim teenagers navigating friends, family, school, online pressure and worship.",
    category: "Youth & Modern Struggles",
    requiredPlan: "premium",
    coverVariant: "blue",
    tags: ["teen", "school", "identity"],
    chapters: [
      "Muslim Teen Survival Guide",
      "Teen Friends Who Shape You",
      "Teen Survival at School Without Losing Salah",
      "Teen Pressure, Desire, and Boundaries",
      "Teen Confidence Without Arrogance",
    ],
  }),
  makeBook({
    title: "Dawah With Wisdom",
    subtitle: "Speak clearly without losing mercy",
    description:
      "A practical dawah book for explaining Islam, answering questions, knowing limits and keeping character beautiful.",
    category: "Reverts",
    requiredPlan: "premium",
    coverVariant: "emerald",
    tags: ["dawah", "conversation", "wisdom"],
    chapters: [
      "Dawah Begins With Character",
      "Dawah: Answer One Question Well",
      "Dawah Limits: Know What You Do Not Know",
      "Dawah Without Pressure",
      "Dawah Follow-Up With Mercy",
    ],
  }),
  makeBook({
    title: "Stories of the Prophets",
    subtitle: "Lessons for courage, mercy, and patience today",
    description:
      "A source-aware reflection path that uses prophetic stories as character lessons without pretending to replace tafsir or seerah scholarship.",
    category: "Character",
    requiredPlan: "premium",
    difficulty: "intermediate",
    coverVariant: "gold",
    tags: ["prophets", "seerah", "character"],
    chapters: [
      "Prophet Stories Are Guidance",
      "Prophet Courage Under Rejection",
      "Prophet Patience in Long Trials",
      "Prophet Mercy After Power",
      "Carry Prophet Lessons Carefully",
    ],
  }),
  makeBook({
    title: "Jannah and the Real Life",
    subtitle: "Let the Hereafter shape today's decisions",
    description:
      "A reflective Akhirah book for turning belief in Jannah, accountability and death into better daily choices.",
    category: "Akhirah",
    requiredPlan: "premium",
    coverVariant: "slate",
    tags: ["jannah", "akhirah", "purpose"],
    chapters: [
      "Remember the Destination",
      "Choose What Lasts",
      "Desire and Delayed Reward",
      "Make Home a Path to Jannah",
      "Ask for the Highest Garden",
    ],
  }),
  makeBook({
    title: "Quran Reflection Journal",
    subtitle: "A guided notebook for meaning and action",
    description:
      "A free guided Quran journaling book that teaches users how to reflect humbly without making unsupported tafsir claims.",
    category: "Quran",
    requiredPlan: "free",
    coverVariant: "emerald",
    tags: ["quran", "journal", "reflection"],
    chapters: [
      "Quran Reflection Journal Basics",
      "Journal the Ayah and Context",
      "Name the Quran Reflection Lesson",
      "Turn Journal Reflection Into Action",
      "Review Your Quran Journal Notes",
    ],
  }),
  makeBook({
    title: "Parent Dua Journal",
    subtitle: "Pray, model, and guide with mercy",
    description:
      "A parent-focused dua and reflection book for raising children with prayer, consistency, warmth and healthy boundaries.",
    category: "Family",
    requiredPlan: "premium",
    coverVariant: "rose",
    tags: ["parenting", "dua", "children"],
    chapters: [
      "Parent Dua and Prayer Before Advice",
      "Model What You Ask For With Warmth",
      "Parent Reflection Journal for Each Child",
      "Guide and Correct With Mercy",
      "Family Worship Consistency and Boundaries",
    ],
  }),
  makeBook({
    title: "Halal Food and Everyday Choices",
    subtitle: "Eat, ask, and choose with calm responsibility",
    description:
      "A careful everyday halal choices primer that builds confidence while sending detailed food and fiqh cases to qualified scholarship.",
    category: "Worship",
    requiredPlan: "scholar",
    difficulty: "advanced",
    coverVariant: "gold",
    tags: ["halal", "food", "fiqh"],
    chapters: [
      "Halal Food Is Worship",
      "Everyday Food Labels Carefully",
      "Eating Out With Halal Food Wisdom",
      "Everyday Doubtful Ingredients",
      "Everyday Food Cases: When to Ask a Scholar",
    ],
  }),
  makeBook({
    title: "Workplace Character for Muslims",
    subtitle: "Honesty, excellence, prayer, and trust at work",
    description:
      "A practical work-life book for Muslims who want their career to show amanah, skill, prayer and good conduct.",
    category: "Wealth & Work",
    requiredPlan: "premium",
    coverVariant: "blue",
    tags: ["work", "character", "amanah"],
    chapters: [
      "Muslim Workplace Amanah",
      "Workplace Character in Small Tasks",
      "Muslim Prayer at Work",
      "Workplace Boundaries With Character",
      "Muslim Excellence Without Ego",
    ],
  }),
  makeBook({
    title: "Loneliness Community and Belonging",
    subtitle: "Find connection without losing yourself",
    description:
      "A compassionate community book for loneliness, friendship, masjid confidence and building belonging with healthy boundaries.",
    category: "Character",
    requiredPlan: "free",
    coverVariant: "purple",
    tags: ["loneliness", "community", "friendship"],
    chapters: [
      "Name Loneliness and Belonging",
      "Connection Without Losing Yourself",
      "Friendship and Good Company",
      "Masjid Confidence and Community Care",
      "Healthy Boundaries for Belonging",
    ],
  }),
  makeBook({
    title: "Prophetic Character Practice Book",
    subtitle: "Practise mercy, truth, patience, and service",
    description:
      "A premium action book for turning love of the Prophet's character into daily practice with humility and consistency.",
    category: "Character",
    requiredPlan: "premium",
    coverVariant: "gold",
    recommended: true,
    tags: ["prophetic character", "seerah", "practice"],
    chapters: [
      "Prophetic Character Becomes Practice",
      "Prophetic Truth and Patience for One Day",
      "Prophetic Mercy in a Tense Moment",
      "Prophetic Service With Humility",
      "Review the Prophetic Practice Book With Consistency",
    ],
  }),
];

export const LIBRARY_CATEGORIES: LibraryCategory[] = [
  "Quran",
  "Arabic",
  "Worship",
  "Duas & Dhikr",
  "Self-Discipline",
  "Family",
  "Character",
  "Wealth & Work",
  "Reverts",
  "Ramadan",
  "Hifz",
  "Akhirah",
  "Youth & Modern Struggles",
];
