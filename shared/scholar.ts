export type ScholarMadhhab =
  | "hanafi"
  | "maliki"
  | "shafii"
  | "hanbali"
  | "general";

export type ScholarJurisdiction = "GB" | "US" | "CA" | "EU" | "SA" | "GLOBAL";

export type ScholarTopic =
  | "islamic_finance"
  | "worship"
  | "family"
  | "purification"
  | "quran"
  | "hadith"
  | "general";

export type ScholarSourceType =
  | "quran"
  | "hadith"
  | "fiqh"
  | "scholar_research"
  | "official_regulator"
  | "app_policy";

export type ScholarSourceReliability =
  | "primary_text"
  | "classical_fiqh"
  | "contemporary_scholar_review"
  | "official_context"
  | "internal_boundary";

export interface ScholarSourceCard {
  id: string;
  type: ScholarSourceType;
  reliability: ScholarSourceReliability;
  title: string;
  reference: string;
  url: string | null;
  summary: string;
  useFor: string;
  doNotUseFor: string;
  topics: ScholarTopic[];
  madhhabTags: ScholarMadhhab[];
  jurisdictionTags: ScholarJurisdiction[];
  verified: boolean;
}

export interface ScholarQuestionInput {
  question: string;
  madhhab?: ScholarMadhhab | string | null;
  jurisdiction?: ScholarJurisdiction | string | null;
  userLevel?: "beginner" | "intermediate" | "advanced" | string | null;
  isRevert?: boolean | null;
}

export interface ScholarQuestionClassification {
  question: string;
  primaryTopic: ScholarTopic;
  secondaryTopics: ScholarTopic[];
  madhhabFilters: ScholarMadhhab[];
  jurisdictionFilters: ScholarJurisdiction[];
  requiresScholarCare: boolean;
  sensitivityReasons: string[];
  userLevel: "beginner" | "intermediate" | "advanced";
  isRevert: boolean;
}

export type ScholarSourceCoverage =
  | "verified_context"
  | "limited_context"
  | "needs_source_review";

export interface ScholarSourcePack {
  coverage: ScholarSourceCoverage;
  sources: ScholarSourceCard[];
  systemBoundary: string;
  answerInstructions: string[];
  failClosedMessage?: string;
}

export interface ScholarAskResponse {
  success: boolean;
  answer: string;
  classification: ScholarQuestionClassification;
  sourcePack: ScholarSourcePack;
  disclaimer: string;
  model?: {
    provider: string;
    tier: string;
    latencyMs: number;
  };
}
