import { z } from "zod";

import type { AISourceCitation } from "./types";

export const SOURCE_PACK_DOMAINS = [
  "tafsir",
  "hadith",
  "fiqh",
  "seerah",
] as const;

export type IslamicSourcePackDomain = (typeof SOURCE_PACK_DOMAINS)[number];

export type IslamicSourcePackStatus =
  | "planned"
  | "draft"
  | "verified"
  | "disabled";

export type IslamicSourcePackLicenseStatus =
  | "not_started"
  | "permission_needed"
  | "licensed"
  | "public_domain"
  | "owned";

export type IslamicSourcePackReviewStatus =
  | "not_started"
  | "in_review"
  | "approved";

export interface IslamicSourcePackManifest {
  id: string;
  domain: IslamicSourcePackDomain;
  title: string;
  status: IslamicSourcePackStatus;
  sourceTitle: string;
  sourceAuthor?: string;
  sourceLanguage?: string;
  licenseStatus: IslamicSourcePackLicenseStatus;
  reviewStatus: IslamicSourcePackReviewStatus;
  importStatus: "not_started" | "ready";
  keywords: string[];
  allowedUse: string;
  forbiddenUse: string;
}

export interface VerifiedIslamicSourceCard {
  id: string;
  packId: string;
  domain: IslamicSourcePackDomain;
  type: Extract<
    AISourceCitation["type"],
    "tafsir" | "hadith" | "fiqh" | "seerah"
  >;
  reference: string;
  title: string;
  explanation: string;
  quote?: string;
  url?: string | null;
  keywords: string[];
  reviewedBy: string;
  reviewedAt: string;
  verified: true;
}

export interface DraftIslamicSourceCard {
  id: string;
  packId: string;
  domain: IslamicSourcePackDomain;
  type: Extract<
    AISourceCitation["type"],
    "tafsir" | "hadith" | "fiqh" | "seerah"
  >;
  reference: string;
  title: string;
  sourceWork: string;
  sourceAuthor?: string;
  sourceUrl: string;
  scopeSummary: string;
  keywords: string[];
  allowedUse: string;
  forbiddenUse: string;
  licenseStatus: IslamicSourcePackLicenseStatus;
  reviewStatus: Exclude<IslamicSourcePackReviewStatus, "approved">;
  active: false;
}

export const IslamicSourcePackManifestSchema = z.object({
  id: z.string().min(3),
  domain: z.enum(SOURCE_PACK_DOMAINS),
  title: z.string().min(8),
  status: z.enum(["planned", "draft", "verified", "disabled"]),
  sourceTitle: z.string().min(8),
  sourceAuthor: z.string().min(2).optional(),
  sourceLanguage: z.string().min(2).optional(),
  licenseStatus: z.enum([
    "not_started",
    "permission_needed",
    "licensed",
    "public_domain",
    "owned",
  ]),
  reviewStatus: z.enum(["not_started", "in_review", "approved"]),
  importStatus: z.enum(["not_started", "ready"]),
  keywords: z.array(z.string().min(2)).min(1),
  allowedUse: z.string().min(24),
  forbiddenUse: z.string().min(24),
});

export const VerifiedIslamicSourceCardSchema = z.object({
  id: z.string().min(3),
  packId: z.string().min(3),
  domain: z.enum(SOURCE_PACK_DOMAINS),
  type: z.enum(["tafsir", "hadith", "fiqh", "seerah"]),
  reference: z.string().min(3),
  title: z.string().min(8),
  explanation: z.string().min(24),
  quote: z.string().min(12).optional(),
  url: z.string().url().nullable().optional(),
  keywords: z.array(z.string().min(2)).min(1),
  reviewedBy: z.string().min(2),
  reviewedAt: z.string().datetime(),
  verified: z.literal(true),
});

export const DraftIslamicSourceCardSchema = z.object({
  id: z.string().min(3),
  packId: z.string().min(3),
  domain: z.enum(SOURCE_PACK_DOMAINS),
  type: z.enum(["tafsir", "hadith", "fiqh", "seerah"]),
  reference: z.string().min(3),
  title: z.string().min(8),
  sourceWork: z.string().min(4),
  sourceAuthor: z.string().min(2).optional(),
  sourceUrl: z.string().url(),
  scopeSummary: z.string().min(24),
  keywords: z.array(z.string().min(2)).min(1),
  allowedUse: z.string().min(24),
  forbiddenUse: z.string().min(24),
  licenseStatus: z.enum([
    "not_started",
    "permission_needed",
    "licensed",
    "public_domain",
    "owned",
  ]),
  reviewStatus: z.enum(["not_started", "in_review"]),
  active: z.literal(false),
});

const TAFSIR_DRAFT_PACK_ID = "tafsir-source-pack-staging";
const HADITH_DRAFT_PACK_ID = "hadith-source-pack-staging";
const FIQH_DRAFT_PACK_ID = "fiqh-source-pack-staging";
const SEERAH_DRAFT_PACK_ID = "seerah-source-pack-staging";

export const ISLAMIC_SOURCE_PACK_MANIFEST: IslamicSourcePackManifest[] = [
  {
    id: "tafsir-source-pack-staging",
    domain: "tafsir",
    title: "Verified Tafsir Source Pack Staging",
    status: "planned",
    sourceTitle: "Pending verified tafsir import",
    licenseStatus: "not_started",
    reviewStatus: "not_started",
    importStatus: "not_started",
    keywords: ["tafsir", "context", "meaning", "revelation"],
    allowedUse:
      "Only after import, licensing, and review, support tafsir-context answers with exact scoped cards.",
    forbiddenUse:
      "Do not cite this staging pack or imply a named tafsir source before reviewed cards exist.",
  },
  {
    id: "hadith-source-pack-staging",
    domain: "hadith",
    title: "Verified Hadith Source Pack Staging",
    status: "planned",
    sourceTitle: "Pending verified hadith import",
    licenseStatus: "not_started",
    reviewStatus: "not_started",
    importStatus: "not_started",
    keywords: ["hadith", "sunnah", "authenticity", "narration"],
    allowedUse:
      "Only after import and review, support hadith reference, authenticity, and context answers.",
    forbiddenUse:
      "Do not quote hadith wording, grades, chains, or commentary from this staging pack before reviewed cards exist.",
  },
  {
    id: "fiqh-source-pack-staging",
    domain: "fiqh",
    title: "Verified Fiqh Source Pack Staging",
    status: "planned",
    sourceTitle: "Pending verified fiqh import",
    licenseStatus: "not_started",
    reviewStatus: "not_started",
    importStatus: "not_started",
    keywords: ["fiqh", "ruling", "madhhab", "worship", "purification"],
    allowedUse:
      "Only after qualified review, support general educational fiqh principles with madhhab-specific scope.",
    forbiddenUse:
      "Do not decide personal rulings, edge cases, or madhhab positions from this staging pack before reviewed cards exist.",
  },
  {
    id: "seerah-source-pack-staging",
    domain: "seerah",
    title: "Verified Seerah Source Pack Staging",
    status: "planned",
    sourceTitle: "Pending verified seerah import",
    licenseStatus: "not_started",
    reviewStatus: "not_started",
    importStatus: "not_started",
    keywords: ["seerah", "prophet", "sirah", "prophetic example"],
    allowedUse:
      "Only after import and review, support seerah timeline, biography, and prophetic-example answers.",
    forbiddenUse:
      "Do not assert dates, incidents, quotes, or lessons from this staging pack before reviewed cards exist.",
  },
];

export const VERIFIED_ISLAMIC_SOURCE_CARDS: VerifiedIslamicSourceCard[] = [];

export const DRAFT_ISLAMIC_SOURCE_CARDS: DraftIslamicSourceCard[] = [
  {
    id: "draft-tafsir-fatihah-overview",
    packId: TAFSIR_DRAFT_PACK_ID,
    domain: "tafsir",
    type: "tafsir",
    reference: "Quran 1:1-7",
    title: "Al-Fatihah overview tafsir candidate",
    sourceWork: "Tafsir Ibn Kathir (Abridged)",
    sourceAuthor: "Ibn Kathir",
    sourceUrl: "https://quran.com/en/1%3A1/tafsirs/en-tafisr-ibn-kathir",
    scopeSummary:
      "Candidate tafsir reference for Al-Fatihah virtues, opening meaning, praise, worship, help, and guidance themes.",
    keywords: ["fatihah", "al-fatiha", "opening", "guide us", "salah"],
    allowedUse:
      "After licensing and review, support beginner tafsir context for Al-Fatihah as a whole.",
    forbiddenUse:
      "Do not cite as active tafsir, quote wording, or infer rulings until reviewed and approved.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-tafsir-fatihah-mercy",
    packId: TAFSIR_DRAFT_PACK_ID,
    domain: "tafsir",
    type: "tafsir",
    reference: "Quran 1:3",
    title: "Al-Fatihah mercy names tafsir candidate",
    sourceWork: "Tafsir Ibn Kathir (Abridged)",
    sourceAuthor: "Ibn Kathir",
    sourceUrl: "https://quran.com/en/1%3A3/tafsirs/ar-tafsir-ibn-kathir",
    scopeSummary:
      "Candidate tafsir reference for Allah's mercy names in Al-Fatihah and how they frame the surah.",
    keywords: ["fatihah", "rahman", "rahim", "mercy", "merciful"],
    allowedUse:
      "After review, support short explanation of mercy themes in Quran 1:3.",
    forbiddenUse:
      "Do not quote, translate, or present named tafsir claims before source review is complete.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-tafsir-ayat-kursi",
    packId: TAFSIR_DRAFT_PACK_ID,
    domain: "tafsir",
    type: "tafsir",
    reference: "Quran 2:255",
    title: "Ayat al-Kursi tafsir candidate",
    sourceWork: "Maarif-ul-Quran",
    sourceAuthor: "Mufti Muhammad Shafi",
    sourceUrl:
      "https://previous.quran.com/2%3A255/tafsirs/en-tafsir-maarif-ul-quran?locale=en",
    scopeSummary:
      "Candidate tafsir reference for Ayat al-Kursi, Allah's life, sustaining power, knowledge, authority, and protection themes.",
    keywords: ["ayat al-kursi", "kursi", "2:255", "protection", "knowledge"],
    allowedUse:
      "After review, support source-backed explanation of Ayat al-Kursi themes.",
    forbiddenUse:
      "Do not cite hadith merits, quote tafsir, or add virtues beyond reviewed cards.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-tafsir-fasting-ramadan",
    packId: TAFSIR_DRAFT_PACK_ID,
    domain: "tafsir",
    type: "tafsir",
    reference: "Quran 2:183-185",
    title: "Ramadan fasting tafsir candidate",
    sourceWork: "Maarif-ul-Quran",
    sourceAuthor: "Mufti Muhammad Shafi",
    sourceUrl:
      "https://previous.quran.com/2%3A183/tafsirs/en-tafsir-maarif-ul-quran?locale=en",
    scopeSummary:
      "Candidate tafsir reference for fasting, taqwa, Ramadan, Quran, concessions, and gratitude themes.",
    keywords: ["ramadan", "fasting", "sawm", "taqwa", "2:183", "2:185"],
    allowedUse:
      "After review, support Ramadan and fasting educational explanations.",
    forbiddenUse:
      "Do not decide personal fasting exemptions or medical cases from this draft source.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-tafsir-ikhlas",
    packId: TAFSIR_DRAFT_PACK_ID,
    domain: "tafsir",
    type: "tafsir",
    reference: "Quran 112:1-4",
    title: "Surah Al-Ikhlas tafsir candidate",
    sourceWork: "Tafsir Ibn Kathir (Abridged)",
    sourceAuthor: "Ibn Kathir",
    sourceUrl: "https://quran.com/en/112%3A1/tafsirs/en-tafisr-ibn-kathir",
    scopeSummary:
      "Candidate tafsir reference for tawhid, Allah's oneness, self-sufficiency, and avoiding misunderstanding.",
    keywords: ["ikhlas", "tawhid", "oneness", "allah one", "112"],
    allowedUse:
      "After review, support beginner explanation of Surah Al-Ikhlas and tawhid themes.",
    forbiddenUse:
      "Do not overextend into theology debates beyond the reviewed card scope.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-tafsir-falaq-nas",
    packId: TAFSIR_DRAFT_PACK_ID,
    domain: "tafsir",
    type: "tafsir",
    reference: "Quran 113:1-114:6",
    title: "Al-Mu'awwidhatayn tafsir candidate",
    sourceWork: "Tafsir Ibn Kathir (Abridged)",
    sourceAuthor: "Ibn Kathir",
    sourceUrl: "https://quran.com/en/113%3A1/tafsirs/en-tafisr-ibn-kathir",
    scopeSummary:
      "Candidate tafsir reference for seeking refuge, spiritual protection, envy, whispers, and daily adhkar context.",
    keywords: ["falaq", "nas", "protection", "whispers", "envy", "refuge"],
    allowedUse:
      "After review, support source-backed explanation of seeking refuge in the final two surahs.",
    forbiddenUse:
      "Do not diagnose sihr, jinn, illness, or personal spiritual conditions from this draft source.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-tafsir-kahf-opening",
    packId: TAFSIR_DRAFT_PACK_ID,
    domain: "tafsir",
    type: "tafsir",
    reference: "Quran 18:1-10",
    title: "Surah Al-Kahf opening tafsir candidate",
    sourceWork: "Maarif-ul-Quran",
    sourceAuthor: "Mufti Muhammad Shafi",
    sourceUrl: "https://quran.com/en/18%3A1/tafsirs/en-tafsir-maarif-ul-quran",
    scopeSummary:
      "Candidate tafsir reference for Surah Al-Kahf opening themes: praise, warning, glad tidings, and youth seeking protection.",
    keywords: ["kahf", "surah kahf", "friday", "cave", "youth", "18"],
    allowedUse:
      "After review, support Surah Al-Kahf reading and beginner context prompts.",
    forbiddenUse:
      "Do not claim Friday-specific virtues from this tafsir card unless separate hadith cards are verified.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-tafsir-prayer-remembrance",
    packId: TAFSIR_DRAFT_PACK_ID,
    domain: "tafsir",
    type: "tafsir",
    reference: "Quran 20:14",
    title: "Prayer and remembrance tafsir candidate",
    sourceWork: "Maarif-ul-Quran",
    sourceAuthor: "Mufti Muhammad Shafi",
    sourceUrl: "https://quran.com/en/20%3A14/tafsirs/en-tafsir-maarif-ul-quran",
    scopeSummary:
      "Candidate tafsir reference for prayer being established for Allah's remembrance and daily worship discipline.",
    keywords: ["prayer", "salah", "remembrance", "dhikr", "20:14"],
    allowedUse:
      "After review, support prayer habit coaching with tafsir-context boundaries.",
    forbiddenUse:
      "Do not issue prayer-law rulings or judge a user's worship state from this draft source.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-hadith-intentions",
    packId: HADITH_DRAFT_PACK_ID,
    domain: "hadith",
    type: "hadith",
    reference: "Sahih al-Bukhari 1",
    title: "Intentions hadith candidate",
    sourceWork: "Sahih al-Bukhari",
    sourceAuthor: "Imam al-Bukhari",
    sourceUrl: "https://sunnah.com/bukhari:1",
    scopeSummary:
      "Candidate hadith reference for explaining intention, sincerity, and why daily worship habits begin with purpose.",
    keywords: ["intention", "niyyah", "sincerity", "actions", "purpose"],
    allowedUse:
      "After licensing and review, support educational reminders about intention and sincerity in worship.",
    forbiddenUse:
      "Do not quote hadith text, judge a user's intention, or infer personal rulings before review is complete.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-hadith-five-pillars",
    packId: HADITH_DRAFT_PACK_ID,
    domain: "hadith",
    type: "hadith",
    reference: "Sahih al-Bukhari 8",
    title: "Five pillars hadith candidate",
    sourceWork: "Sahih al-Bukhari",
    sourceAuthor: "Imam al-Bukhari",
    sourceUrl: "https://sunnah.com/bukhari:8",
    scopeSummary:
      "Candidate hadith reference for summarising Islam's core pillars in beginner onboarding and learning answers.",
    keywords: [
      "five pillars",
      "pillars",
      "islam",
      "shahadah",
      "salah",
      "zakat",
    ],
    allowedUse:
      "After review, support beginner explanations of Islam's core pillars and app learning journeys.",
    forbiddenUse:
      "Do not use this draft to decide detailed fiqh obligations, zakat calculations, or edge cases.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-hadith-jibril-foundations",
    packId: HADITH_DRAFT_PACK_ID,
    domain: "hadith",
    type: "hadith",
    reference: "Sahih Muslim 8a",
    title: "Jibril hadith foundations candidate",
    sourceWork: "Sahih Muslim",
    sourceAuthor: "Imam Muslim",
    sourceUrl: "https://sunnah.com/muslim:8a",
    scopeSummary:
      "Candidate hadith reference for Islam, iman, ihsan, and beginner-friendly explanations of spiritual growth.",
    keywords: ["jibril", "iman", "ihsan", "islam", "faith", "spiritual growth"],
    allowedUse:
      "After review, support high-level educational answers about Islam, iman, ihsan, and faith development.",
    forbiddenUse:
      "Do not grade a user's faith state or answer sensitive theology disputes from this draft.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-hadith-remembrance-gatherings",
    packId: HADITH_DRAFT_PACK_ID,
    domain: "hadith",
    type: "hadith",
    reference: "Sahih Muslim 2699a",
    title: "Remembrance gatherings hadith candidate",
    sourceWork: "Sahih Muslim",
    sourceAuthor: "Imam Muslim",
    sourceUrl: "https://sunnah.com/muslim:2699a",
    scopeSummary:
      "Candidate hadith reference for dhikr, remembrance gatherings, and encouraging users toward gentle daily remembrance.",
    keywords: ["dhikr", "remembrance", "gathering", "dua", "tasbeeh"],
    allowedUse:
      "After review, support educational encouragement around dhikr, tasbeeh, and learning circles.",
    forbiddenUse:
      "Do not promise specific outcomes, quote wording, or create unsupported reward claims from this draft.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-hadith-good-character",
    packId: HADITH_DRAFT_PACK_ID,
    domain: "hadith",
    type: "hadith",
    reference: "Sahih al-Bukhari 6035",
    title: "Good character hadith candidate",
    sourceWork: "Sahih al-Bukhari",
    sourceAuthor: "Imam al-Bukhari",
    sourceUrl: "https://sunnah.com/bukhari:6035",
    scopeSummary:
      "Candidate hadith reference for adab, good character, family conduct, and daily self-improvement prompts.",
    keywords: ["character", "adab", "manners", "family", "akhlaq"],
    allowedUse:
      "After review, support general educational reminders about character and conduct.",
    forbiddenUse:
      "Do not use this draft to judge users, family disputes, or sensitive relationship cases.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-hadith-anger-restraint",
    packId: HADITH_DRAFT_PACK_ID,
    domain: "hadith",
    type: "hadith",
    reference: "Sahih al-Bukhari 6116",
    title: "Anger restraint hadith candidate",
    sourceWork: "Sahih al-Bukhari",
    sourceAuthor: "Imam al-Bukhari",
    sourceUrl: "https://sunnah.com/bukhari:6116",
    scopeSummary:
      "Candidate hadith reference for emotional restraint, anger management, and reflective self-control prompts.",
    keywords: ["anger", "restraint", "self control", "patience", "akhlaq"],
    allowedUse:
      "After review, support gentle educational prompts about anger restraint and self-control.",
    forbiddenUse:
      "Do not replace mental health support, family safety advice, or crisis guidance with this draft source.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-hadith-ummah-compassion",
    packId: HADITH_DRAFT_PACK_ID,
    domain: "hadith",
    type: "hadith",
    reference: "Sahih Muslim 2586a",
    title: "Ummah compassion hadith candidate",
    sourceWork: "Sahih Muslim",
    sourceAuthor: "Imam Muslim",
    sourceUrl: "https://sunnah.com/muslim:2586a",
    scopeSummary:
      "Candidate hadith reference for compassion, community care, and family/community motivation.",
    keywords: ["compassion", "community", "ummah", "mercy", "family"],
    allowedUse:
      "After review, support general reminders about compassion, brotherhood, and community care.",
    forbiddenUse:
      "Do not use this draft to issue personal rulings or override safeguarding boundaries.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-hadith-seeking-knowledge",
    packId: HADITH_DRAFT_PACK_ID,
    domain: "hadith",
    type: "hadith",
    reference: "Sahih Muslim 2699b",
    title: "Seeking knowledge path candidate",
    sourceWork: "Sahih Muslim",
    sourceAuthor: "Imam Muslim",
    sourceUrl: "https://sunnah.com/muslim:2699b",
    scopeSummary:
      "Candidate hadith reference for learning journeys, Quran study, Arabic learning, and knowledge-seeking encouragement.",
    keywords: ["knowledge", "learn", "study", "quran learning", "arabic"],
    allowedUse:
      "After review, support educational motivation around learning, study paths, and knowledge habits.",
    forbiddenUse:
      "Do not quote wording or make unsupported claims about individual reward before review.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-fiqh-wudu-validity",
    packId: FIQH_DRAFT_PACK_ID,
    domain: "fiqh",
    type: "fiqh",
    reference: "Hanafi purity: wudu validity",
    title: "Wudu validity fiqh candidate",
    sourceWork: "SeekersGuidance Hanafi Fiqh Answers",
    sourceAuthor: "SeekersGuidance",
    sourceUrl:
      "https://seekersguidance.org/answers/hanafi-fiqh/are-acts-of-worship-valid-if-not-performed-in-a-state-of-purity/",
    scopeSummary:
      "Candidate fiqh reference for explaining wudu-related validity boundaries for worship in a general educational way.",
    keywords: ["wudu", "purity", "ablution", "valid prayer", "state of purity"],
    allowedUse:
      "After qualified review, support general educational purity guidance and when to seek more specific fiqh help.",
    forbiddenUse:
      "Do not decide personal waswasa, medical discharge, bleeding, or edge-case purity rulings from this draft.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-fiqh-ghusl-basics",
    packId: FIQH_DRAFT_PACK_ID,
    domain: "fiqh",
    type: "fiqh",
    reference: "Hanafi purity: ghusl basics",
    title: "Ghusl basics fiqh candidate",
    sourceWork: "SeekersGuidance Hanafi Fiqh Answers",
    sourceAuthor: "SeekersGuidance",
    sourceUrl:
      "https://seekersguidance.org/answers/hanafi-fiqh/the-ritual-bath-ghusl-obligatory-recommended-and-disliked-acts/",
    scopeSummary:
      "Candidate fiqh reference for beginner explanations of ghusl as an educational purity topic.",
    keywords: ["ghusl", "ritual bath", "purity", "janabah", "womens health"],
    allowedUse:
      "After qualified review, support beginner educational explanations of ghusl and purity preparation.",
    forbiddenUse:
      "Do not answer sensitive sexual, postnatal, menstruation, or medical edge cases from this draft alone.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-fiqh-makeup-prayers",
    packId: FIQH_DRAFT_PACK_ID,
    domain: "fiqh",
    type: "fiqh",
    reference: "Hanafi prayer: qada basics",
    title: "Makeup prayers fiqh candidate",
    sourceWork: "SeekersGuidance Hanafi Fiqh Answers",
    sourceAuthor: "SeekersGuidance",
    sourceUrl:
      "https://seekersguidance.org/answers/hanafi-fiqh/prayers-to-be-made-up/",
    scopeSummary:
      "Candidate fiqh reference for explaining missed prayer make-up basics and gentle qada planning boundaries.",
    keywords: ["qada", "makeup prayer", "missed prayers", "witr", "salah"],
    allowedUse:
      "After qualified review, support general qada education and planning prompts with careful boundaries.",
    forbiddenUse:
      "Do not calculate personal obligations, judge past worship, or handle anxiety/waswasa cases from this draft alone.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-fiqh-travel-prayer",
    packId: FIQH_DRAFT_PACK_ID,
    domain: "fiqh",
    type: "fiqh",
    reference: "Hanafi prayer: travel prayer",
    title: "Travel prayer fiqh candidate",
    sourceWork: "SeekersGuidance Hanafi Fiqh Answers",
    sourceAuthor: "SeekersGuidance",
    sourceUrl:
      "https://seekersguidance.org/answers/hanafi-fiqh/do-i-shorten-prayers-during-frequent-work-travel/",
    scopeSummary:
      "Candidate fiqh reference for educational travel-prayer prompts around distance, shortening, and prayer planning.",
    keywords: ["travel", "traveler", "qasr", "shorten prayer", "journey"],
    allowedUse:
      "After qualified review, support general travel-prayer education and app reminders to check rulings before travel.",
    forbiddenUse:
      "Do not decide a user's travel status, route edge cases, congregation cases, or madhhab disputes from this draft.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-fiqh-fasting-invalidators",
    packId: FIQH_DRAFT_PACK_ID,
    domain: "fiqh",
    type: "fiqh",
    reference: "Hanafi fasting: invalidators",
    title: "Fasting invalidators fiqh candidate",
    sourceWork: "SeekersGuidance Hanafi Fiqh Answers",
    sourceAuthor: "SeekersGuidance",
    sourceUrl:
      "https://seekersguidance.org/answers/hanafi-fiqh/principles-on-what-invalidates-the-fast/",
    scopeSummary:
      "Candidate fiqh reference for general educational fasting invalidator prompts and Ramadan caution messaging.",
    keywords: ["fasting", "ramadan", "invalidates fast", "sawm", "qada fast"],
    allowedUse:
      "After qualified review, support general educational explanations of fasting caution and when to ask a scholar.",
    forbiddenUse:
      "Do not decide medical, medication, illness, pregnancy, or complex fasting cases from this draft.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-fiqh-menstruation-fasting",
    packId: FIQH_DRAFT_PACK_ID,
    domain: "fiqh",
    type: "fiqh",
    reference: "Hanafi fasting: menstruation",
    title: "Menstruation and fasting fiqh candidate",
    sourceWork: "SeekersGuidance Hanafi Fiqh Answers",
    sourceAuthor: "SeekersGuidance",
    sourceUrl:
      "https://seekersguidance.org/answers/hanafi-fiqh/what-if-a-woman-gets-her-periods-while-fasting/",
    scopeSummary:
      "Candidate fiqh reference for women's health education around fasting, prayer pause boundaries, and qada reminders.",
    keywords: ["menstruation", "period", "fasting", "qada", "women"],
    allowedUse:
      "After qualified review, support respectful women’s health educational prompts and qada tracking boundaries.",
    forbiddenUse:
      "Do not classify individual bleeding, irregular cycles, pregnancy, medical issues, or personal rulings from this draft.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-fiqh-zakat-basics",
    packId: FIQH_DRAFT_PACK_ID,
    domain: "fiqh",
    type: "fiqh",
    reference: "Hanafi zakat: calculation basics",
    title: "Zakat basics fiqh candidate",
    sourceWork: "SeekersGuidance Hanafi Fiqh Answers",
    sourceAuthor: "SeekersGuidance",
    sourceUrl:
      "https://seekersguidance.org/answers/hanafi-fiqh/zakat-how-to-calculate-who-to-give/",
    scopeSummary:
      "Candidate fiqh reference for zakat basics, nisab, yearly obligation, and calculator explanation boundaries.",
    keywords: ["zakat", "nisab", "charity", "wealth", "zakat calculator"],
    allowedUse:
      "After qualified review, support general zakat education and clearer calculator explanations.",
    forbiddenUse:
      "Do not finalize personal zakat calculations, investments, debts, business assets, or recipient eligibility from this draft.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-fiqh-nisab-standard",
    packId: FIQH_DRAFT_PACK_ID,
    domain: "fiqh",
    type: "fiqh",
    reference: "Hanafi zakat: gold or silver nisab",
    title: "Nisab standard fiqh candidate",
    sourceWork: "SeekersGuidance Hanafi Fiqh Answers",
    sourceAuthor: "SeekersGuidance",
    sourceUrl:
      "https://seekersguidance.org/answers/hanafi-fiqh/do-we-calculate-nisab-with-gold-or-silver/",
    scopeSummary:
      "Candidate fiqh reference for explaining gold/silver nisab choices and cautious zakat-calculator copy.",
    keywords: ["nisab", "gold", "silver", "zakat", "wealth"],
    allowedUse:
      "After qualified review, support general explanations of nisab choices and calculator assumptions.",
    forbiddenUse:
      "Do not choose a user's zakat standard or issue financial advice from this draft alone.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-seerah-first-revelation",
    packId: SEERAH_DRAFT_PACK_ID,
    domain: "seerah",
    type: "seerah",
    reference: "First revelation and beginning of prophethood",
    title: "First revelation seerah candidate",
    sourceWork: "Yaqeen Institute Seerah Resources",
    sourceAuthor: "Yaqeen Institute",
    sourceUrl:
      "https://yaqeeninstitute.org/series/the-life-of-prophet-muhammad",
    scopeSummary:
      "Candidate seerah reference for beginner context around the first revelation, prophethood, and early spiritual responsibility.",
    keywords: ["first revelation", "hira", "iqra", "prophethood", "makkah"],
    allowedUse:
      "After review, support gentle beginner seerah context for revelation and early prophethood.",
    forbiddenUse:
      "Do not assert exact dates, quote narrations, or build legal conclusions from this draft source.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-seerah-khadijah-support",
    packId: SEERAH_DRAFT_PACK_ID,
    domain: "seerah",
    type: "seerah",
    reference: "Khadijah and early support",
    title: "Khadijah support seerah candidate",
    sourceWork: "Yaqeen Institute Seerah Resources",
    sourceAuthor: "Yaqeen Institute",
    sourceUrl:
      "https://yaqeeninstitute.org/series/the-life-of-prophet-muhammad",
    scopeSummary:
      "Candidate seerah reference for Khadijah's support, early Muslim household strength, and family-centered learning prompts.",
    keywords: ["khadijah", "family", "support", "early islam", "household"],
    allowedUse:
      "After review, support educational reflections on early support, family care, and faith under pressure.",
    forbiddenUse:
      "Do not make unsupported biographical details, marital advice, or gender-role claims from this draft.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-seerah-early-persecution-patience",
    packId: SEERAH_DRAFT_PACK_ID,
    domain: "seerah",
    type: "seerah",
    reference: "Early Makkah hardship and patience",
    title: "Early hardship seerah candidate",
    sourceWork: "Yaqeen Institute Seerah Resources",
    sourceAuthor: "Yaqeen Institute",
    sourceUrl:
      "https://yaqeeninstitute.org/series/the-life-of-prophet-muhammad",
    scopeSummary:
      "Candidate seerah reference for early Muslim hardship, patience, spiritual resilience, and non-sensational reflection prompts.",
    keywords: ["makkah", "persecution", "patience", "sabr", "early muslims"],
    allowedUse:
      "After review, support educational seerah context around patience and resilience.",
    forbiddenUse:
      "Do not compare user hardship directly to prophetic hardship or make therapeutic claims from this draft.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-seerah-hijrah-madinah",
    packId: SEERAH_DRAFT_PACK_ID,
    domain: "seerah",
    type: "seerah",
    reference: "Hijrah to Madinah",
    title: "Hijrah to Madinah seerah candidate",
    sourceWork: "Yaqeen Institute Seerah Resources",
    sourceAuthor: "Yaqeen Institute",
    sourceUrl:
      "https://yaqeeninstitute.org/series/the-life-of-prophet-muhammad",
    scopeSummary:
      "Candidate seerah reference for Hijrah themes: trust, planning, sacrifice, community, and new beginnings.",
    keywords: ["hijrah", "madinah", "migration", "new beginning", "community"],
    allowedUse:
      "After review, support educational context around Hijrah and personal renewal themes.",
    forbiddenUse:
      "Do not assert exact route details, cave narratives, dates, or rulings from this draft alone.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-seerah-madinah-community",
    packId: SEERAH_DRAFT_PACK_ID,
    domain: "seerah",
    type: "seerah",
    reference: "Building the Madinah community",
    title: "Madinah community seerah candidate",
    sourceWork: "Yaqeen Institute Seerah Resources",
    sourceAuthor: "Yaqeen Institute",
    sourceUrl:
      "https://yaqeeninstitute.org/series/the-life-of-prophet-muhammad",
    scopeSummary:
      "Candidate seerah reference for mosque-centered community, brotherhood, family bonds, and communal responsibility.",
    keywords: [
      "madinah",
      "community",
      "masjid",
      "brotherhood",
      "family circle",
    ],
    allowedUse:
      "After review, support community and family-circle educational prompts inspired by Madinah themes.",
    forbiddenUse:
      "Do not present political/legal claims or detailed constitutional assertions from this draft source.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-seerah-hudaybiyyah-wisdom",
    packId: SEERAH_DRAFT_PACK_ID,
    domain: "seerah",
    type: "seerah",
    reference: "Treaty of Hudaybiyyah",
    title: "Hudaybiyyah wisdom seerah candidate",
    sourceWork: "Yaqeen Institute Seerah Resources",
    sourceAuthor: "Yaqeen Institute",
    sourceUrl:
      "https://yaqeeninstitute.org/series/the-life-of-prophet-muhammad",
    scopeSummary:
      "Candidate seerah reference for Hudaybiyyah themes: patience, strategy, trust, and delayed wisdom.",
    keywords: ["hudaybiyyah", "treaty", "patience", "wisdom", "strategy"],
    allowedUse:
      "After review, support educational reflections on patience, restraint, and long-term wisdom.",
    forbiddenUse:
      "Do not assert treaty clauses, dates, or political lessons without reviewed source detail.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-seerah-conquest-mercy",
    packId: SEERAH_DRAFT_PACK_ID,
    domain: "seerah",
    type: "seerah",
    reference: "Conquest of Makkah and mercy",
    title: "Conquest mercy seerah candidate",
    sourceWork: "Yaqeen Institute Seerah Resources",
    sourceAuthor: "Yaqeen Institute",
    sourceUrl:
      "https://yaqeeninstitute.org/series/the-life-of-prophet-muhammad",
    scopeSummary:
      "Candidate seerah reference for mercy, forgiveness, restraint, and spiritual victory themes around the conquest of Makkah.",
    keywords: ["conquest", "makkah", "forgiveness", "mercy", "victory"],
    allowedUse:
      "After review, support educational reflections on mercy, forgiveness, and humility after success.",
    forbiddenUse:
      "Do not quote speeches, list incidents, or make conflict-related claims without reviewed evidence.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
  {
    id: "draft-seerah-farewell-sermon",
    packId: SEERAH_DRAFT_PACK_ID,
    domain: "seerah",
    type: "seerah",
    reference: "Farewell sermon and final guidance",
    title: "Farewell guidance seerah candidate",
    sourceWork: "Yaqeen Institute Seerah Resources",
    sourceAuthor: "Yaqeen Institute",
    sourceUrl:
      "https://yaqeeninstitute.org/series/the-life-of-prophet-muhammad",
    scopeSummary:
      "Candidate seerah reference for final guidance themes: worship, rights, responsibility, and prophetic legacy.",
    keywords: ["farewell sermon", "final sermon", "rights", "legacy", "hajj"],
    allowedUse:
      "After review, support high-level educational reflections on prophetic legacy and responsibility.",
    forbiddenUse:
      "Do not quote sermon text, assert disputed wording, or derive rulings without reviewed sources.",
    licenseStatus: "permission_needed",
    reviewStatus: "not_started",
    active: false,
  },
];

function includesKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

export function verifiedIslamicSourcePackCardsForQuery(
  query: string,
): AISourceCitation[] {
  const lower = query.toLowerCase();
  return VERIFIED_ISLAMIC_SOURCE_CARDS.filter((card) =>
    card.keywords.some((keyword) => includesKeyword(lower, keyword)),
  ).map((card) => ({
    type: card.type,
    reference: card.reference,
    explanation: `${card.title}. ${card.explanation}`,
    quote: card.quote,
    url: card.url,
    provenance: "reviewed_app_content" as const,
  }));
}

export function sourcePackReadinessSummary(): {
  plannedDomains: IslamicSourcePackDomain[];
  verifiedCardCount: number;
  manifestCount: number;
} {
  return {
    plannedDomains: SOURCE_PACK_DOMAINS.filter((domain) =>
      ISLAMIC_SOURCE_PACK_MANIFEST.some((pack) => pack.domain === domain),
    ),
    verifiedCardCount: VERIFIED_ISLAMIC_SOURCE_CARDS.length,
    manifestCount: ISLAMIC_SOURCE_PACK_MANIFEST.length,
  };
}
