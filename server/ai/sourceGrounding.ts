import * as fs from "node:fs";
import * as path from "node:path";

import type {
  AISourceCitation,
  AISourceCoverage,
  AITextRequest,
} from "./types";
import {
  buildScholarSourcePack,
  classifyScholarQuestion,
} from "./scholarAgent";
import { verifiedIslamicSourcePackCardsForQuery } from "./islamicSourcePacks";
import { isValidQuranReference, quranUrl } from "./quranReference";
import {
  OFFICIAL_SERVICE_LINKS,
  type OfficialServiceLink,
} from "../../client/data/officialServiceLinks";

interface TrustedSource extends AISourceCitation {
  id: string;
  keywords: string[];
}

type QuranContextEntry = {
  verseKey?: string;
  contextType?: string;
  content?: string;
  source?: string;
  relevanceTag?: string;
};

export const TRUSTED_SOURCES: TrustedSource[] = [
  {
    id: "quran-fatihah",
    type: "quran",
    reference: "Quran 1:1-7",
    explanation:
      "Primary source anchor for Al-Fatihah, salah meaning, mercy, guidance, worship, and seeking help.",
    url: "https://quran.com/1",
    keywords: [
      "fatihah",
      "fatiha",
      "al-fatiha",
      "opening",
      "salah meaning",
      "guide us",
      "seeking help",
    ],
  },
  {
    id: "quran-fatihah-iyyaka",
    type: "quran",
    reference: "Quran 1:5",
    explanation:
      "Source anchor for the Al-Fatihah phrase iyyaka na'budu wa iyyaka nasta'in.",
    url: "https://quran.com/1/5",
    keywords: [
      "iyyaka",
      "iyyaka na'budu",
      "na'budu",
      "you alone we worship",
      "you alone we ask for help",
    ],
  },
  {
    id: "quran-purpose",
    type: "quran",
    reference: "Quran 51:56",
    explanation: "Source anchor for worship, purpose, and life direction.",
    url: "https://quran.com/51/56",
    keywords: ["purpose", "why created", "worship", "meaning of life"],
  },
  {
    id: "quran-capacity",
    type: "quran",
    reference: "Quran 2:286",
    explanation:
      "Source anchor for hardship, responsibility, and Allah not burdening a soul beyond capacity.",
    url: "https://quran.com/2/286",
    keywords: ["hardship", "overwhelmed", "capacity", "burden", "struggling"],
  },
  {
    id: "quran-dhikr-heart",
    type: "quran",
    reference: "Quran 13:28",
    explanation:
      "Source anchor for remembrance of Allah and steadiness of the heart.",
    url: "https://quran.com/13/28",
    keywords: ["dhikr", "remembrance", "heart", "anxiety", "peace"],
  },
  {
    id: "quran-prayer",
    type: "quran",
    reference: "Quran 20:14",
    explanation:
      "Source anchor for establishing prayer for remembrance of Allah.",
    url: "https://quran.com/20/14",
    keywords: [
      "prayer",
      "salah",
      "salat",
      "fajr",
      "dhuhr",
      "asr",
      "maghrib",
      "isha",
    ],
  },
  {
    id: "quran-salah-conduct",
    type: "quran",
    reference: "Quran 29:45",
    explanation:
      "Source anchor for prayer shaping conduct and restraining shameful or wrong actions.",
    url: "https://quran.com/29/45",
    keywords: ["prayer", "salah", "sin", "bad habits", "conduct"],
  },
  {
    id: "quran-repentance",
    type: "quran",
    reference: "Quran 39:53",
    explanation:
      "Source anchor for hope, repentance, and not despairing of Allah's mercy.",
    url: "https://quran.com/39/53",
    keywords: ["repentance", "tawbah", "sin", "forgive", "despair", "mercy"],
  },
  {
    id: "quran-sabr",
    type: "quran",
    reference: "Quran 2:153",
    explanation: "Source anchor for seeking help through patience and prayer.",
    url: "https://quran.com/2/153",
    keywords: ["sabr", "patience", "help", "struggle", "hardship"],
  },
  {
    id: "quran-tawakkul",
    type: "quran",
    reference: "Quran 65:3",
    explanation:
      "Source anchor for reliance on Allah while taking responsible action.",
    url: "https://quran.com/65/3",
    keywords: ["tawakkul", "trust allah", "reliance", "provision"],
  },
  {
    id: "quran-parents",
    type: "quran",
    reference: "Quran 17:23-24",
    explanation: "Source anchor for honouring parents with mercy and adab.",
    url: "https://quran.com/17/23-24",
    keywords: ["parents", "mother", "father", "family", "revert family"],
  },
  {
    id: "quran-marriage",
    type: "quran",
    reference: "Quran 30:21",
    explanation:
      "Source anchor for mercy, tranquillity, and affection in marriage.",
    url: "https://quran.com/30/21",
    keywords: ["marriage", "spouse", "husband", "wife", "nikah"],
  },
  {
    id: "quran-family-kindness",
    type: "quran",
    reference: "Quran 4:19",
    explanation:
      "Source anchor for kindness and restraint in family relationships.",
    url: "https://quran.com/4/19",
    keywords: ["marriage", "family", "kindness", "wife", "husband"],
  },
  {
    id: "quran-backbiting",
    type: "quran",
    reference: "Quran 49:12",
    explanation:
      "Source anchor for guarding speech, suspicion, and backbiting.",
    url: "https://quran.com/49/12",
    keywords: ["backbiting", "gossip", "suspicion", "speech", "tongue"],
  },
  {
    id: "quran-modesty",
    type: "quran",
    reference: "Quran 24:30-31",
    explanation: "Source anchor for modesty, gaze, and dignity.",
    url: "https://quran.com/24/30-31",
    keywords: ["modesty", "hijab", "gaze", "lower gaze"],
  },
  {
    id: "quran-fasting",
    type: "quran",
    reference: "Quran 2:183",
    explanation: "Source anchor for fasting and taqwa.",
    url: "https://quran.com/2/183",
    keywords: ["fasting", "ramadan", "sawm", "taqwa"],
  },
  {
    id: "quran-zakat",
    type: "quran",
    reference: "Quran 9:60",
    explanation:
      "Source anchor for zakat categories and the need for care in zakat topics.",
    url: "https://quran.com/9/60",
    keywords: ["zakat", "charity", "sadaqah", "wealth"],
  },
  {
    id: "quran-riba-trade",
    type: "quran",
    reference: "Quran 2:275",
    explanation:
      "Source anchor for distinguishing lawful trade from riba in Islamic finance topics.",
    url: "https://quran.com/2/275",
    keywords: ["riba", "interest", "trade", "crypto", "cryptocurrency"],
  },
  {
    id: "quran-wealth-consent",
    type: "quran",
    reference: "Quran 4:29",
    explanation:
      "Source anchor for lawful exchange, mutual consent, and avoiding wrongful consumption of wealth.",
    url: "https://quran.com/4/29",
    keywords: ["wealth", "trade", "mutual consent", "fraud", "crypto"],
  },
  {
    id: "quran-menstruation",
    type: "quran",
    reference: "Quran 2:222",
    explanation:
      "Source anchor for dignity and care around menstruation; personal rulings still need qualified scholarship.",
    url: "https://quran.com/2/222",
    keywords: [
      "menstruation",
      "period",
      "haidh",
      "bleeding",
      "cycle",
      "womens health",
    ],
  },
  {
    id: "hadith-menses-qada-fasts",
    type: "hadith",
    reference: "Sunan an-Nasa'i 2318",
    explanation:
      "Verified source anchor that menstruating women make up missed fasts but are not instructed to make up missed prayers; personal cases still need qualified scholarship.",
    url: "https://sunnah.com/nasai:2318",
    keywords: [
      "menstruation",
      "period",
      "haidh",
      "qada",
      "make up fast",
      "make-up fast",
      "missed fast",
      "missed prayer",
      "prayers",
      "ramadan fast",
      "womens health",
    ],
  },
  {
    id: "quran-women-faith",
    type: "quran",
    reference: "Quran 33:35",
    explanation:
      "Source anchor for Muslim men and women sharing worship, virtue, and reward.",
    url: "https://quran.com/33/35",
    keywords: ["women", "sisters", "reward", "worship", "equality"],
  },
  {
    id: "quran-wudu",
    type: "quran",
    reference: "Quran 5:6",
    explanation:
      "Source anchor for wudu, purification, and prayer preparation.",
    url: "https://quran.com/5/6",
    keywords: ["wudu", "ablution", "purification", "ghusl"],
  },
  {
    id: "quran-ask-knowledge",
    type: "quran",
    reference: "Quran 16:43",
    explanation:
      "Source anchor for asking people of knowledge when a matter needs qualified learning.",
    url: "https://quran.com/16/43",
    keywords: [
      "ask a scholar",
      "qualified scholar",
      "people of knowledge",
      "fatwa",
      "ruling",
      "fiqh",
      "madhab",
      "madhhab",
    ],
  },
  {
    id: "quran-prophetic-example",
    type: "quran",
    reference: "Quran 33:21",
    explanation:
      "Source anchor for learning from the prophetic example with humility and care.",
    url: "https://quran.com/33/21",
    keywords: ["seerah", "prophet example", "sunnah", "prophetic model"],
  },
  {
    id: "quran-isra-miraj",
    type: "quran",
    reference: "Quran 17:1",
    explanation:
      "Source anchor for the Night Journey; extra annual-date practices need separate evidence.",
    url: "https://quran.com/17/1",
    keywords: ["isra", "miraj", "isra miraj", "night journey"],
  },
  {
    id: "quran-ramadan-month",
    type: "quran",
    reference: "Quran 2:185",
    explanation: "Source anchor for Ramadan as the month of Quran and fasting.",
    url: "https://quran.com/2/185",
    keywords: ["ramadan", "month of quran", "eid", "laylatul qadr"],
  },
  {
    id: "quran-hajj-obligation",
    type: "quran",
    reference: "Quran 3:97",
    explanation:
      "Source anchor for Hajj as an obligation for those able to make the journey.",
    url: "https://quran.com/3/97",
    keywords: ["hajj", "umrah", "pilgrimage", "kaaba", "makkah"],
  },
  {
    id: "quran-recitation",
    type: "quran",
    reference: "Quran 73:20",
    explanation:
      "Source anchor for regular Quran recitation according to ability.",
    url: "https://quran.com/73/20",
    keywords: ["quran recitation", "read quran", "recite", "hifz"],
  },
  {
    id: "quran-tarteel",
    type: "quran",
    reference: "Quran 73:4",
    explanation:
      "Source anchor for measured, deliberate Quran recitation and recitation practice.",
    url: "https://quran.com/73/4",
    keywords: [
      "tarteel",
      "tajweed",
      "recitation coach",
      "recite slowly",
      "measured recitation",
    ],
  },
  {
    id: "quran-read",
    type: "quran",
    reference: "Quran 96:1",
    explanation: "Source anchor for learning, reading, and seeking knowledge.",
    url: "https://quran.com/96/1",
    keywords: ["learn", "reading", "knowledge", "arabic learning"],
  },
  {
    id: "quran-arabic-understanding",
    type: "quran",
    reference: "Quran 12:2",
    explanation:
      "Source anchor for Quranic Arabic learning being connected to understanding the Quran.",
    url: "https://quran.com/12/2",
    keywords: [
      "quranic arabic",
      "arabic quran",
      "understand quran",
      "learn arabic",
      "quran language",
    ],
  },
  {
    id: "quran-arabic-clear-verses",
    type: "quran",
    reference: "Quran 41:3",
    explanation:
      "Source anchor for Arabic Quran study, clear verses, and careful word learning.",
    url: "https://quran.com/41/3",
    keywords: [
      "quranic arabic",
      "arabic language",
      "verses explained",
      "quran words",
      "word meaning",
      "word meanings",
    ],
  },
  {
    id: "quran-ease",
    type: "quran",
    reference: "Quran 54:17",
    explanation: "Source anchor for Quran remembrance and structured learning.",
    url: "https://quran.com/54/17",
    keywords: ["memorise", "memorize", "quran learning", "easy quran"],
  },
  {
    id: "quran-light-guidance",
    type: "quran",
    reference: "Quran 2:257",
    explanation:
      "Source anchor for guidance from darkness into light in spiritual growth prompts.",
    url: "https://quran.com/2/257",
    keywords: ["nur", "light", "guidance", "darkness into light"],
  },
  {
    id: "quran-hope",
    type: "quran",
    reference: "Quran 12:87",
    explanation: "Source anchor for hope and not despairing of Allah's mercy.",
    url: "https://quran.com/12/87",
    keywords: ["hope", "despair", "sad", "mercy"],
  },
  {
    id: "quran-time",
    type: "quran",
    reference: "Quran 103:1-3",
    explanation:
      "Source anchor for time, faith, righteous action, truth, and patience.",
    url: "https://quran.com/103",
    keywords: ["time", "discipline", "routine", "habits"],
  },
  {
    id: "hadith-intention",
    type: "hadith",
    reference: "Sahih al-Bukhari 1",
    explanation:
      "Source anchor for intention and the inner purpose behind actions.",
    url: "https://sunnah.com/bukhari:1",
    keywords: ["intention", "niyyah", "purpose"],
  },
  {
    id: "hadith-fatihah-dialogue",
    type: "hadith",
    reference: "Sahih Muslim 395",
    explanation:
      "Verified source anchor for Al-Fatihah as a prayer dialogue between servant and Lord.",
    url: "https://sunnah.com/muslim:395",
    keywords: ["fatihah dialogue", "surah fatiha prayer", "al-fatiha"],
  },
  {
    id: "hadith-ramadan-fasting",
    type: "hadith",
    reference: "Sahih al-Bukhari 1899",
    explanation:
      "Verified source anchor for Ramadan fasting and faith-based self-accounting.",
    url: "https://sunnah.com/bukhari:1899",
    keywords: ["ramadan fasting", "fast ramadan", "sawm", "forgiven"],
  },
  {
    id: "hadith-hajj-virtue",
    type: "hadith",
    reference: "Sahih Muslim 1337",
    explanation:
      "Verified source anchor for Hajj virtue; operational travel claims still need official service sources.",
    url: "https://sunnah.com/muslim:1337",
    keywords: ["hajj virtue", "accepted hajj", "mabrur", "pilgrimage"],
  },
  {
    id: "hadith-consistency",
    type: "hadith",
    reference: "Sahih al-Bukhari 6464",
    explanation: "Source anchor for protecting small, regular deeds.",
    url: "https://sunnah.com/bukhari:6464",
    keywords: ["consistent", "consistency", "small deeds", "habit"],
  },
  {
    id: "hadith-anger",
    type: "hadith",
    reference: "Sahih al-Bukhari 6114",
    explanation:
      "Source anchor for strength being connected to self-control during anger.",
    url: "https://sunnah.com/bukhari:6114",
    keywords: ["anger", "angry", "self-control", "strength"],
  },
  {
    id: "hadith-dua",
    type: "hadith",
    reference: "Jami at-Tirmidhi 3372",
    explanation: "Source anchor for dua as worship.",
    url: "https://sunnah.com/tirmidhi:3372",
    keywords: ["dua", "supplication"],
  },
  {
    id: "hadith-knowledge",
    type: "hadith",
    reference: "Sahih Muslim 2699a",
    explanation: "Source anchor for seeking knowledge and paths of goodness.",
    url: "https://sunnah.com/muslim:2699a",
    keywords: ["knowledge", "learn", "study", "arabic learning"],
  },
  {
    id: "hadith-learn-teach-quran",
    type: "hadith",
    reference: "Sahih al-Bukhari 5027",
    explanation:
      "Verified source anchor for the virtue of learning the Quran and teaching it.",
    url: "https://sunnah.com/bukhari:5027",
    keywords: [
      "learn quran",
      "teach quran",
      "quran teacher",
      "quran learning",
      "quran study",
    ],
  },
  {
    id: "hadith-safe-muslim",
    type: "hadith",
    reference: "Sahih al-Bukhari 10",
    explanation:
      "Source anchor for guarding the tongue and hand from harming others.",
    url: "https://sunnah.com/bukhari:10",
    keywords: ["harm", "tongue", "speech", "safe muslim"],
  },
];

const QURAN_REFERENCE_REGEX =
  /\b(?:qur'?an|surah|sura)\s+(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?\b/gi;
const HADITH_REFERENCE_REGEX =
  /\b(?:(sahih\s+)?(al-)?bukhari|sahih\s+muslim|muslim|jami(?:`|')?\s+at-?tirmidhi|tirmidhi|abu\s+dawud|abi\s+dawud|sunan\s+abi\s+dawud|sunan\s+an-?nasa'?i|nasa'?i|ibn\s+majah)\s+(\d+[a-z]?)\b/gi;
const HADITH_DATA_FILES = [
  "bukhari.json",
  "muslim.json",
  "abu_dawud.json",
  "tirmidhi.json",
  "nasai.json",
  "ibn_majah.json",
];
const HADITH_COLLECTION_SLUGS: Record<string, string> = {
  bukhari: "bukhari",
  muslim: "muslim",
  abu_dawud: "abudawud",
  tirmidhi: "tirmidhi",
  nasai: "nasai",
  ibn_majah: "ibnmajah",
};

const OFFICIAL_SERVICE_CONTEXT_KEYWORDS = [
  "hajj",
  "umrah",
  "nusuk",
  "rawdah",
  "makkah",
  "madinah",
  "pilgrim",
  "pilgrimage",
  "haramain",
];

const OFFICIAL_SERVICE_INTENT_KEYWORDS = [
  "official",
  "permit",
  "permits",
  "visa",
  "registration",
  "register",
  "booking",
  "book",
  "package",
  "packages",
  "package selection",
  "payment",
  "hotel",
  "accommodation",
  "provider",
  "health",
  "vaccine",
  "vaccination",
  "medication",
  "medical",
  "emergency",
  "scam",
  "fraud",
  "transport",
  "train",
  "railway",
  "bus",
  "taxi",
  "airport",
  "lost",
  "separated",
  "card",
  "identity",
  "passport",
  "wheelchair",
  "accessibility",
  "complaint",
  "safety",
  "route",
  "services",
];

const OFFICIAL_SERVICE_MATCHERS: Record<string, string[]> = {
  "nusuk-official-platform": [
    "official",
    "nusuk",
    "permit",
    "rawdah",
    "service",
    "complaint",
  ],
  "nusuk-umrah-platform": [
    "umrah visa",
    "visa",
    "booking",
    "package",
    "hotel",
    "accommodation",
    "provider",
    "payment",
    "rawdah",
  ],
  "ministry-hajj-umrah": [
    "ministry",
    "official rule",
    "announcement",
    "guide",
    "awareness",
  ],
  "nusuk-card-ministry": [
    "nusuk card",
    "pilgrim card",
    "lost",
    "identity",
    "id card",
    "separated",
  ],
  "nusuk-hajj-health-guidelines": [
    "hajj health",
    "health",
    "health guidance",
    "medication",
    "medical",
    "wheelchair",
    "elderly",
    "emergency contact",
  ],
  "nusuk-umrah-health-guidelines": [
    "umrah health",
    "health",
    "health guidance",
    "dehydration",
    "falls",
    "respiratory",
    "food poisoning",
    "emergency",
  ],
  "saudi-moh-pilgrim-health": [
    "health",
    "health guidance",
    "vaccine",
    "vaccination",
    "health requirement",
    "entry requirement",
    "point of entry",
  ],
  "travel-state-hajj-umrah": [
    "scam",
    "fraud",
    "fake visa",
    "off-platform",
    "us traveler",
    "passport",
    "consulate",
    "safety",
  ],
  "cdc-hajj-umrah-yellow-book": [
    "cdc",
    "travel medicine",
    "heat",
    "crowd",
    "medication",
    "chronic",
    "pregnancy",
  ],
  "pilgrim-experience-program-nusuk": [
    "nusuk services",
    "official services",
    "flight",
    "hotel",
    "tour",
    "qibla",
  ],
  "hajj-1447-registration-nusuk": [
    "hajj 1447",
    "hajj 2026",
    "hajj registration",
    "domestic hajj",
    "package selection",
    "hajj package",
    "sadad",
    "licensed companies",
    "hajj permit",
  ],
  "haramain-high-speed-railway": [
    "haramain",
    "train",
    "railway",
    "transport",
    "airport",
    "station",
    "jeddah",
  ],
  "ministry-umrah-awareness-guide": [
    "awareness guide",
    "accessibility",
    "walking track",
    "mosque service",
    "crowd density",
    "transport",
  ],
};

type HadithSourceIndex = Map<string, AISourceCitation>;
type QuranContextIndex = Map<string, QuranContextEntry[]>;

let cachedHadithSourceIndex: HadithSourceIndex | null = null;
let cachedQuranContextIndex: QuranContextIndex | null = null;

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeMetadataSearchText(metadata?: Record<string, unknown>): string {
  if (!metadata) return "";

  const direct = metadata as Record<string, unknown>;
  const context =
    direct.context && typeof direct.context === "object"
      ? (direct.context as Record<string, unknown>)
      : {};
  const selectedDialogue =
    context.selectedDialogue && typeof context.selectedDialogue === "object"
      ? (context.selectedDialogue as Record<string, unknown>)
      : {};
  const values = [
    direct.question,
    direct.feature,
    direct.category,
    context.question,
    context.feature,
    context.topic,
    context.category,
    context.instruction,
    context.surahName,
    selectedDialogue.title,
    selectedDialogue.goal,
    ...(Array.isArray(context.sourceRefs)
      ? context.sourceRefs.map(stringValue)
      : []),
  ]
    .map(stringValue)
    .filter((value): value is string => Boolean(value));

  return values.join("\n");
}

function uniqueSources(sources: AISourceCitation[]): AISourceCitation[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.type}:${source.reference.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesKeyword(text: string, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return false;

  const pattern = normalized
    .split(/\s+/)
    .map((part) => escapeRegExp(part))
    .join("\\s+");
  return new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, "i").test(text);
}

function normalizeHadithCollection(raw: string): {
  referenceName: string;
  slug: string;
} | null {
  const lower = raw.toLowerCase().replace(/\s+/g, " ").trim();
  if (lower.includes("bukhari"))
    return { referenceName: "Sahih al-Bukhari", slug: "bukhari" };
  if (lower.includes("muslim"))
    return { referenceName: "Sahih Muslim", slug: "muslim" };
  if (lower.includes("tirmidhi"))
    return { referenceName: "Jami at-Tirmidhi", slug: "tirmidhi" };
  if (lower.includes("abu dawud") || lower.includes("abi dawud"))
    return { referenceName: "Sunan Abu Dawud", slug: "abudawud" };
  if (lower.includes("nasai") || lower.includes("nasa"))
    return { referenceName: "Sunan an-Nasa'i", slug: "nasai" };
  if (lower.includes("ibn majah"))
    return { referenceName: "Sunan Ibn Majah", slug: "ibnmajah" };
  return null;
}

function hadithSourceKey(slug: string, number: string): string {
  return `${slug}:${number.toLowerCase()}`;
}

function hadithNumberFromUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const match = url.match(/sunnah\.com\/[^:]+:(\d+[a-z]?)/i);
  return match?.[1]?.toLowerCase() || null;
}

function hadithNumberFromReference(reference: unknown): string | null {
  if (typeof reference !== "string") return null;
  const match = reference.match(/\b(\d+[a-z]?)\b$/i);
  return match?.[1]?.toLowerCase() || null;
}

function loadHadithSourceIndex(): HadithSourceIndex {
  if (cachedHadithSourceIndex) return cachedHadithSourceIndex;

  const index: HadithSourceIndex = new Map();
  const dataRoot = path.join(process.cwd(), "client", "data");

  for (const fileName of HADITH_DATA_FILES) {
    const filePath = path.join(dataRoot, fileName);
    if (!fs.existsSync(filePath)) continue;

    let data: {
      chapters?: {
        hadiths?: Record<string, unknown>[];
      }[];
    };

    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      continue;
    }

    for (const chapter of data.chapters || []) {
      for (const hadith of chapter.hadiths || []) {
        if (hadith.sourceReviewStatus !== "source_link_verified") continue;

        const collectionId = String(hadith.sourceCollectionId || "");
        const slug = HADITH_COLLECTION_SLUGS[collectionId];
        if (!slug) continue;

        const number =
          hadithNumberFromUrl(hadith.sourceUrl) ||
          hadithNumberFromReference(hadith.sourceReference) ||
          hadithNumberFromReference(hadith.originalReference);
        if (!number) continue;

        const sourceUrl =
          typeof hadith.sourceUrl === "string" ? hadith.sourceUrl : null;
        if (!sourceUrl?.startsWith(`https://sunnah.com/${slug}:${number}`)) {
          continue;
        }

        const referenceNumber = hadithNumberFromReference(
          hadith.sourceReference,
        );
        if (referenceNumber && referenceNumber !== number) continue;

        const sourceReference =
          typeof hadith.sourceReference === "string"
            ? hadith.sourceReference
            : `${hadith.sourceCollectionName || "Hadith"} ${number}`;
        index.set(hadithSourceKey(slug, number), {
          type: "hadith",
          reference: sourceReference,
          explanation:
            "Verified NurAI hadith source index entry. Use the source page for wording and numbering verification.",
          url: sourceUrl,
          provenance: "exact_reference",
        });
      }
    }
  }

  cachedHadithSourceIndex = index;
  return index;
}

function verifiedHadithSource(
  collectionSlug: string,
  number: string,
): AISourceCitation | null {
  return (
    loadHadithSourceIndex().get(hadithSourceKey(collectionSlug, number)) || null
  );
}

function loadQuranContextIndex(): QuranContextIndex {
  if (cachedQuranContextIndex) return cachedQuranContextIndex;

  const index: QuranContextIndex = new Map();
  const filePath = path.join(
    process.cwd(),
    "client",
    "data",
    "quranContexts.json",
  );
  if (!fs.existsSync(filePath)) {
    cachedQuranContextIndex = index;
    return index;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<
      string,
      QuranContextEntry[]
    >;
    for (const [verseKey, entries] of Object.entries(parsed)) {
      if (!Array.isArray(entries)) continue;
      const safeEntries = entries.filter(
        (entry) =>
          typeof entry?.content === "string" &&
          entry.content.trim() &&
          typeof entry?.source === "string" &&
          entry.source.trim(),
      );
      if (safeEntries.length) index.set(verseKey, safeEntries);
    }
  } catch {
    // Fail closed: if the reviewed app pack cannot load, it is not cited.
  }

  cachedQuranContextIndex = index;
  return index;
}

function quranVerseKeysFromText(text: string): string[] {
  const keys: string[] = [];
  for (const match of text.matchAll(QURAN_REFERENCE_REGEX)) {
    const surah = Number.parseInt(match[1], 10);
    const ayah = Number.parseInt(match[2], 10);
    const endAyah = match[3] ? Number.parseInt(match[3], 10) : undefined;
    if (!isValidQuranReference(surah, ayah, endAyah)) continue;
    keys.push(`${surah}:${ayah}`);
    if (endAyah) {
      for (let current = ayah + 1; current <= endAyah; current += 1) {
        if (isValidQuranReference(surah, current))
          keys.push(`${surah}:${current}`);
      }
    }
  }
  return keys;
}

function quranVerseKeysFromMetadata(
  metadata?: Record<string, unknown>,
): string[] {
  if (!metadata || metadata.trustedSourceContext !== true) return [];
  const context = metadata.context as Record<string, unknown> | undefined;
  const direct = metadata as Record<string, unknown>;
  const surah =
    context?.surahNumber ||
    context?.surah ||
    direct.surahNumber ||
    direct.surah;
  const ayah =
    context?.ayahNumber || context?.ayah || direct.ayahNumber || direct.verse;
  const parsedSurah = Number.parseInt(String(surah || ""), 10);
  const parsedAyah = Number.parseInt(String(ayah || ""), 10);
  if (!isValidQuranReference(parsedSurah, parsedAyah)) return [];
  return [`${parsedSurah}:${parsedAyah}`];
}

function sourceRefsFromTrustedMetadata(
  metadata?: Record<string, unknown>,
): AISourceCitation[] {
  if (!metadata || metadata.trustedSourceContext !== true) return [];
  const context = metadata.context as Record<string, unknown> | undefined;
  const refs = [
    ...(Array.isArray(context?.sourceRefs) ? context.sourceRefs : []),
    ...(Array.isArray(metadata.sourceRefs) ? metadata.sourceRefs : []),
  ]
    .map(stringValue)
    .filter((value): value is string => Boolean(value));

  return refs.flatMap(exactReferencesFromText);
}

function reviewedContextSourcesFromEntry(
  entry: QuranContextEntry,
): AISourceCitation[] {
  const sourceText = stringValue(entry.source);
  const content = stringValue(entry.content);
  if (!sourceText || !content) return [];

  return exactReferencesFromText(sourceText).map((source) => ({
    ...source,
    explanation: `Reviewed NurAI ${entry.contextType || "Quran"} context anchored to ${sourceText}.`,
    quote: content,
    provenance: "reviewed_app_content" as const,
  }));
}

function reviewedQuranContextSources(
  query: string,
  metadata?: Record<string, unknown>,
): AISourceCitation[] {
  const index = loadQuranContextIndex();
  const verseKeys = Array.from(
    new Set([
      ...quranVerseKeysFromMetadata(metadata),
      ...quranVerseKeysFromText(query),
    ]),
  );

  return verseKeys
    .flatMap((verseKey) => index.get(verseKey) || [])
    .flatMap(reviewedContextSourcesFromEntry)
    .slice(0, 5);
}

function exactReferencesFromText(text: string): AISourceCitation[] {
  const sources: AISourceCitation[] = [];

  for (const match of text.matchAll(QURAN_REFERENCE_REGEX)) {
    const surah = Number.parseInt(match[1], 10);
    const ayah = Number.parseInt(match[2], 10);
    const endAyah = match[3] ? Number.parseInt(match[3], 10) : undefined;
    if (!isValidQuranReference(surah, ayah, endAyah)) continue;

    const reference = `Quran ${match[1]}:${match[2]}${match[3] ? `-${match[3]}` : ""}`;
    sources.push({
      type: "quran",
      reference,
      explanation:
        "Exact Quran reference detected in the request or app context.",
      url: quranUrl(reference),
      provenance: "exact_reference",
    });
  }

  for (const match of text.matchAll(HADITH_REFERENCE_REGEX)) {
    const collection = normalizeHadithCollection(match[0]);
    const hadithNumber = match[3]?.toLowerCase();
    if (!collection || !hadithNumber) continue;

    const verifiedSource = verifiedHadithSource(collection.slug, hadithNumber);
    if (verifiedSource) sources.push(verifiedSource);
  }

  return sources;
}

function referencesFromMetadata(
  metadata?: Record<string, unknown>,
): AISourceCitation[] {
  if (!metadata) return [];
  if (metadata.trustedSourceContext !== true) return [];

  const context = metadata.context as Record<string, unknown> | undefined;
  const direct = metadata as Record<string, unknown>;
  const surah =
    context?.surahNumber ||
    context?.surah ||
    direct.surahNumber ||
    direct.surah;
  const ayah =
    context?.ayahNumber || context?.ayah || direct.ayahNumber || direct.verse;
  if (!surah || !ayah) return [];

  const reference = `Quran ${surah}:${ayah}`;
  const parsedSurah = Number.parseInt(String(surah), 10);
  const ayahMatch = String(ayah).match(/^(\d{1,3})(?:-(\d{1,3}))?$/);
  if (!ayahMatch) return [];
  const parsedAyah = Number.parseInt(ayahMatch[1], 10);
  const parsedEndAyah = ayahMatch[2]
    ? Number.parseInt(ayahMatch[2], 10)
    : undefined;
  if (!isValidQuranReference(parsedSurah, parsedAyah, parsedEndAyah)) return [];

  const quoteParts = [
    stringValue(context?.arabicText || context?.arabic),
    stringValue(context?.translation),
    stringValue(context?.verseInsight),
  ].filter((part): part is string => Boolean(part));

  return [
    {
      type: "quran",
      reference,
      explanation: "Current Quran reader or tafsir context supplied by NurAI.",
      quote: quoteParts.length ? quoteParts.join("\n") : undefined,
      url: quranUrl(reference),
      provenance: "metadata_context",
    },
  ];
}

function keywordSources(query: string): AISourceCitation[] {
  const lower = query.toLowerCase();
  const matches = TRUSTED_SOURCES.filter((source) =>
    source.keywords.some((keyword) => includesKeyword(lower, keyword)),
  );

  return matches
    .sort((first, second) => second.keywords.length - first.keywords.length)
    .map(({ id: _id, keywords: _keywords, ...source }) => ({
      ...source,
      provenance: "keyword_anchor" as const,
    }));
}

function sourcePackCitationType(
  source: ReturnType<typeof buildScholarSourcePack>["sources"][number],
): AISourceCitation["type"] {
  if (source.type === "quran") return "quran";
  if (source.type === "hadith") return "hadith";
  if (source.type === "official_regulator") return "official_service";
  if (source.type === "app_policy") return "app_context";
  return "fiqh";
}

function hasInvalidQuranReference(text: string): boolean {
  for (const match of text.matchAll(QURAN_REFERENCE_REGEX)) {
    const surah = Number.parseInt(match[1], 10);
    const ayah = Number.parseInt(match[2], 10);
    const endAyah = match[3] ? Number.parseInt(match[3], 10) : undefined;
    if (!isValidQuranReference(surah, ayah, endAyah)) return true;
  }
  return false;
}

function hasUnverifiedHadithReference(text: string): boolean {
  for (const match of text.matchAll(HADITH_REFERENCE_REGEX)) {
    const collection = normalizeHadithCollection(match[0]);
    const hadithNumber = match[3]?.toLowerCase();
    if (!collection || !hadithNumber) return true;
    if (!verifiedHadithSource(collection.slug, hadithNumber)) return true;
  }
  return false;
}

function shouldUseScholarSourcePack(query: string): boolean {
  if (hasInvalidQuranReference(query) || hasUnverifiedHadithReference(query)) {
    return false;
  }
  if (exactReferencesFromText(query).length > 0) return false;

  const lower = query.toLowerCase();
  if (
    /\b(divorce|talaq|khula|inheritance|abuse|domestic violence|suicide|self[-\s]?harm|medical advice|diagnosis)\b/.test(
      lower,
    )
  ) {
    return false;
  }

  return /\b(salah|salat|prayer|fajr|dhuhr|asr|maghrib|isha|ramadan|fast|sawm|wudu|ghusl|purification|menstruation|period|haidh|nifas|istihadha|bleeding|discharge|crypto|cryptocurrency|bitcoin|ethereum|riba|zakat|finance|hadith|sunnah|seerah|prophetic example|prophet'?s example|seeking knowledge|quranic arabic|arabic quran|quran word|quran words|word meaning|word meanings|recitation|tajweed|tarteel|hifz|memorise|memorize|memorisation|memorization)\b/.test(
    lower,
  );
}

function scholarSourcePackSources(query: string): AISourceCitation[] {
  if (!shouldUseScholarSourcePack(query)) return [];

  const classification = classifyScholarQuestion({ question: query });
  const pack = buildScholarSourcePack(classification);
  if (pack.coverage === "needs_source_review") return [];

  return pack.sources.map((source) => ({
    type: sourcePackCitationType(source),
    reference: source.reference,
    explanation: `${source.title}. Use for: ${source.useFor} Boundary: ${source.doNotUseFor} Summary: ${source.summary}`,
    url: source.url,
    provenance: "reviewed_app_content" as const,
  }));
}

function officialServiceCitation(
  service: OfficialServiceLink,
): AISourceCitation {
  return {
    type: "official_service",
    reference: service.title,
    explanation: `${service.useFor} Boundary: ${service.doNotUseFor} Last checked: ${service.lastChecked}.`,
    url: service.url,
    provenance: "official_service",
  };
}

function officialServiceSources(query: string): AISourceCitation[] {
  const lower = query.toLowerCase();
  const hasPilgrimageContext = OFFICIAL_SERVICE_CONTEXT_KEYWORDS.some(
    (keyword) => includesKeyword(lower, keyword),
  );
  if (!hasPilgrimageContext) return [];

  const hasServiceIntent = OFFICIAL_SERVICE_INTENT_KEYWORDS.some((keyword) =>
    includesKeyword(lower, keyword),
  );
  if (!hasServiceIntent) return [];

  const matches = OFFICIAL_SERVICE_LINKS.map((service) => {
    const matchers = OFFICIAL_SERVICE_MATCHERS[service.id] || [
      service.category,
      service.title,
      service.authority,
    ];
    const score = matchers.reduce(
      (total, keyword) => total + (includesKeyword(lower, keyword) ? 1 : 0),
      0,
    );
    return { service, score };
  })
    .filter(({ score }) => score > 0)
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return (
        OFFICIAL_SERVICE_LINKS.indexOf(first.service) -
        OFFICIAL_SERVICE_LINKS.indexOf(second.service)
      );
    });

  return matches
    .slice(0, 6)
    .map(({ service }) => officialServiceCitation(service));
}

function needsScholarReview(query: string): boolean {
  return /\b(fatwa|ruling|divorce|talaq|khula|inheritance|abuse|domestic violence|suicide|self[-\s]?harm|crisis|depression|addiction|medical|bleeding|period|menstruation|haidh|nifas|istihadha|zakat calculation|mortgage|riba|crypto|cryptocurrency|bitcoin|staking|defi|halal income|haram income)\b/i.test(
    query,
  );
}

function hasHighIntegrityProvenance(citation: AISourceCitation): boolean {
  return (
    citation.provenance === "exact_reference" ||
    citation.provenance === "metadata_context" ||
    citation.provenance === "official_service" ||
    citation.provenance === "reviewed_app_content"
  );
}

function hasTrustedQuranReaderContext(
  request: AITextRequest,
  citations: AISourceCitation[],
): boolean {
  const metadata = request.metadata;
  if (!metadata || metadata.trustedSourceContext !== true) return false;
  if (metadata.feature !== "quran" && request.useCase !== "tafsir") {
    return false;
  }

  const context = metadata.context as Record<string, unknown> | undefined;
  const direct = metadata as Record<string, unknown>;
  const surah = context?.surahNumber || context?.surah || direct.surahNumber;
  const ayah = context?.ayahNumber || context?.ayah || direct.ayahNumber;
  const parsedSurah = Number.parseInt(String(surah || ""), 10);
  const parsedAyah = Number.parseInt(String(ayah || ""), 10);
  if (!isValidQuranReference(parsedSurah, parsedAyah)) return false;

  const hasSelectedAyahText = Boolean(
    stringValue(context?.arabicText || context?.arabic) ||
      stringValue(context?.translation),
  );
  if (!hasSelectedAyahText) return false;

  const exactReference = `Quran ${parsedSurah}:${parsedAyah}`.toLowerCase();
  return citations.some(
    (citation) =>
      citation.type === "quran" &&
      citation.provenance === "metadata_context" &&
      citation.reference.toLowerCase() === exactReference,
  );
}

function sourceCoverageFor(
  request: AITextRequest,
  citations: AISourceCitation[],
  needsScholar: boolean,
): AISourceCoverage {
  const risk = request.risk || "low";
  const highIntegrityCitationCount = citations.filter(
    hasHighIntegrityProvenance,
  );
  const hasVerifiedProvenance = highIntegrityCitationCount.length > 0;
  const onlyOfficialServiceHighIntegrity =
    highIntegrityCitationCount.length > 0 &&
    highIntegrityCitationCount.every(
      (citation) => citation.type === "official_service",
    );

  if (needsScholar && onlyOfficialServiceHighIntegrity) {
    return "needs_source_review";
  }

  if (
    !needsScholar &&
    hasTrustedQuranReaderContext(request, highIntegrityCitationCount)
  ) {
    return "verified_context";
  }

  if (
    !hasVerifiedProvenance &&
    (risk === "religious" ||
      risk === "sensitive" ||
      needsScholar ||
      request.useCase === "tafsir")
  ) {
    return "needs_source_review";
  }

  if (highIntegrityCitationCount.length >= 2) return "verified_context";
  if (citations.length > 0) return "reference_detected";
  if (
    risk === "religious" ||
    risk === "sensitive" ||
    request.useCase === "tafsir"
  ) {
    return "needs_source_review";
  }
  return "limited_context";
}

function normalizedCitationReference(reference: string): string {
  return reference.toLowerCase().replace(/\s+/g, " ").trim();
}

const OFFICIAL_REFERENCE_STOP_WORDS = new Set([
  "and",
  "the",
  "official",
  "platform",
  "guidelines",
  "guidance",
  "requirements",
  "update",
]);

function officialServiceAppearsInAnswer(
  answer: string,
  citation: AISourceCitation,
): boolean {
  if (citation.type !== "official_service") return false;
  const normalizedAnswer = normalizedCitationReference(answer);
  const normalizedReference = normalizedCitationReference(citation.reference);
  if (normalizedAnswer.includes(normalizedReference)) return true;

  if (citation.url) {
    try {
      const hostname = new URL(citation.url).hostname.replace(/^www\./, "");
      if (normalizedAnswer.includes(hostname.toLowerCase())) return true;
    } catch {}
  }

  const words = (citation.reference.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((word) => word.length > 2)
    .filter((word) => !OFFICIAL_REFERENCE_STOP_WORDS.has(word));
  if (words.length < 2) return false;

  const candidatePhrases = [
    words.slice(0, 2).join(" "),
    words.slice(0, 3).join(" "),
    [words[0], words[words.length - 1]].join(" "),
  ].filter((phrase, index, list) => phrase && list.indexOf(phrase) === index);

  return candidatePhrases.some((phrase) => includesKeyword(answer, phrase));
}

function quranReferencePattern(reference: string): RegExp | null {
  const match = reference.match(
    /^Quran\s+(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/i,
  );
  if (!match) return null;
  const [, surah, ayah, endAyah] = match;
  const verse = endAyah ? `${ayah}\\s*-\\s*${endAyah}` : ayah;
  return new RegExp(
    `\\b(?:qur'?an\\s+)?${escapeRegExp(surah)}\\s*:\\s*${verse}\\b`,
    "i",
  );
}

export function citationAppearsInAnswer(
  answer: string,
  citation: AISourceCitation,
): boolean {
  if (officialServiceAppearsInAnswer(answer, citation)) return true;

  const quranPattern = quranReferencePattern(citation.reference);
  if (quranPattern?.test(answer)) return true;

  const normalizedAnswer = normalizedCitationReference(answer);
  const normalizedReference = normalizedCitationReference(citation.reference);
  return normalizedAnswer.includes(normalizedReference);
}

export function citationsAppearingInAnswer(
  answer: string,
  citations: AISourceCitation[],
): AISourceCitation[] {
  return citations.filter((citation) =>
    citationAppearsInAnswer(answer, citation),
  );
}

function hasUnsupportedSelectedQuranExtraClaim(answer: string): boolean {
  const lower = answer.toLowerCase();
  const sourceLimitLanguage =
    /\b(?:need|needs|require|requires|requiring|without|not supplied|not provided|not available|limited|source support|verified source|verified sources|source cards|stronger sources)\b/i.test(
      answer,
    );

  if (
    /\b(?:ibn kathir|ibn kathīr|tabari|ṭabari|qurtubi|qurṭubi)\b/i.test(answer)
  ) {
    return true;
  }

  if (
    /\b(?:revealed because|revealed when|revealed after|revealed for|was revealed because|were revealed because|occasion of revelation was)\b/i.test(
      answer,
    )
  ) {
    return true;
  }

  if (/\b(?:asbab|asbāb|asbaab|occasion of revelation)\b/i.test(answer)) {
    return !sourceLimitLanguage;
  }

  if (
    /\b(?:the|this|a)\s+(?:ruling|fatwa)\s+(?:is|was|says|states)\b/i.test(
      answer,
    )
  ) {
    return true;
  }

  if (/\b(?:is|are|was|were)\s+(?:halal|haram)\b/i.test(answer)) {
    return !/\b(?:halal|haram)\s+(?:claims?|rulings?|details?)\s+(?:need|require)/i.test(
      lower,
    );
  }

  return false;
}

export function sourceCoverageForAnswer(
  request: AITextRequest,
  answer: string,
  citations: AISourceCitation[],
  needsScholar: boolean,
): AISourceCoverage {
  const appearing = citationsAppearingInAnswer(answer, citations);
  const trustedReaderCitations =
    hasTrustedQuranReaderContext(request, citations) &&
    !needsScholar &&
    !hasUnsupportedSelectedQuranExtraClaim(answer)
      ? citations.filter(
          (citation) =>
            citation.type === "quran" &&
            citation.provenance === "metadata_context",
        )
      : [];

  return sourceCoverageFor(
    request,
    uniqueSources([...appearing, ...trustedReaderCitations]),
    needsScholar,
  );
}

function buildSourcePrompt(params: {
  request: AITextRequest;
  citations: AISourceCitation[];
  sourceCoverage: AISourceCoverage;
  needsScholar: boolean;
}): string {
  const cards = params.citations.length
    ? params.citations
        .map((source, index) => {
          const url = source.url ? `\n   URL: ${source.url}` : "";
          const explanation = source.explanation
            ? `\n   Scope: ${source.explanation}`
            : "";
          const quote = source.quote
            ? `\n   Verified quote/context: ${source.quote.slice(0, 320)}`
            : "";
          return `${index + 1}. ${source.reference} [${source.type}]${explanation}${quote}${url}`;
        })
        .join("\n")
    : "No verified source card matched this request.";

  const scholarLine = params.needsScholar
    ? "\n- This request appears sensitive. Give general principles only and direct personal rulings to a qualified scholar."
    : "";

  return `NURAI SOURCE-GROUNDED ANSWERING RULES:
- Use the verified source cards below as the only citation cards for this answer.
- Do not invent Quran, hadith, tafsir, scholar, book, madhhab, grade, or reference numbers.
- Do not quote Quran or hadith wording unless it appears inside a verified source card as Verified quote/context.
- If the source cards are insufficient for a claim, say source support is limited instead of guessing.
- If a selected Quran ayah has metadata_context with Arabic or translation, answer the plain meaning first from that selected ayah. Do not open with "needs source review" for plain ayah meaning. Only mark extra tafsir, asbab al-nuzul, hadith virtues, fiqh rulings, Arabic roots, dates, places, or scholar claims as requiring stronger sources.
- For hadith source cards, NurAI may only cite the collection/reference and source URL unless verified wording appears in the source card.
- For official_service cards, use them only for official routing, travel, health-preparation, transport, or safety claims; do not treat them as fiqh, legal, medical, visa, booking, or permit authority inside NurAI.
- For reviewed_app_content cards, use the supplied app-written context only within the shown source scope. Do not present it as a fatwa or as a named tafsir unless the card itself names that source.
- Source coverage for this request: ${params.sourceCoverage}.${scholarLine}

VERIFIED SOURCE CARDS:
${cards}`;
}

export function buildSourceGrounding(request: AITextRequest): {
  citations: AISourceCitation[];
  sourceCoverage: AISourceCoverage;
  needsScholar: boolean;
  sourcePrompt: string;
} {
  const userText = request.messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");
  const query = `${userText}\n${safeMetadataSearchText(request.metadata)}`;
  const citations = uniqueSources([
    ...referencesFromMetadata(request.metadata),
    ...sourceRefsFromTrustedMetadata(request.metadata),
    ...exactReferencesFromText(query),
    ...reviewedQuranContextSources(query, request.metadata),
    ...verifiedIslamicSourcePackCardsForQuery(query),
    ...officialServiceSources(query),
    ...scholarSourcePackSources(query),
    ...keywordSources(query),
  ]).slice(0, 8);
  const needsScholar =
    (request.risk || "low") === "sensitive" || needsScholarReview(query);
  const sourceCoverage = sourceCoverageFor(request, citations, needsScholar);

  return {
    citations,
    sourceCoverage,
    needsScholar,
    sourcePrompt: buildSourcePrompt({
      request,
      citations,
      sourceCoverage,
      needsScholar,
    }),
  };
}

export function withSourceGroundingPrompt(
  request: AITextRequest,
  sourcePrompt: string,
): AITextRequest {
  const firstSystemIndex = request.messages.findIndex(
    (message) => message.role === "system",
  );

  if (firstSystemIndex >= 0) {
    const messages = [...request.messages];
    messages[firstSystemIndex] = {
      ...messages[firstSystemIndex],
      content: `${messages[firstSystemIndex].content}\n\n${sourcePrompt}`,
    };
    return { ...request, messages };
  }

  return {
    ...request,
    messages: [{ role: "system", content: sourcePrompt }, ...request.messages],
  };
}
