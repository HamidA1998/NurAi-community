export const NURAI_AI_MODE_IDS = [
  "ask_nurai",
  "quran_guide",
  "arabic_tutor",
  "hifz_coach",
  "salah_coach",
  "dua_helper",
  "discipline_coach",
  "new_muslim_guide",
  "family_guide",
  "ramadan_coach",
  "scholar_mode",
] as const;

export type AIModeId = (typeof NURAI_AI_MODE_IDS)[number];

export type NurAIPlanTier = "free" | "premium" | "scholar";

export type AIModeSafetyCategory =
  | "general_learning"
  | "religious_learning"
  | "sensitive_guidance"
  | "family_guidance"
  | "scholar_guarded";

export type AIModeSourceRule =
  | "app_context_allowed"
  | "verified_sources_required"
  | "source_cards_required"
  | "scholar_review_recommended";

export type AIResponseLength = "short" | "standard" | "deep";

export type AIModelRoutingTier = "basic" | "standard" | "advanced";

export type AIMemoryAccessLevel =
  | "none"
  | "session"
  | "recent_activity"
  | "safe_profile"
  | "learning_memory"
  | "recommendation_memory"
  | "scholar_guarded";

export type AIResponseFormat =
  | "answer_explanation_source_action"
  | "daily_insight"
  | "study_plan"
  | "coach_plan"
  | "source_card_response";

export type AITrustState =
  | "verified_source"
  | "educational_summary"
  | "ai_reflection"
  | "needs_scholar";

export type MuslimGrowthGoal =
  | "understand_quran"
  | "learn_arabic"
  | "improve_salah"
  | "memorise_quran"
  | "build_discipline"
  | "increase_dhikr"
  | "become_consistent"
  | "new_muslim_path"
  | "revert_support"
  | "family_growth"
  | "improve_family"
  | "islamic_knowledge"
  | "islamic_learning"
  | "ramadan_preparation"
  | "reduce_bad_habits"
  | "improve_character"
  | "general_growth";

export interface IdentityGoalProfile {
  userId?: string;
  selectedGoals: MuslimGrowthGoal[];
  primaryGoal?: MuslimGrowthGoal;
  currentFocus?: string;
  preferredJourney?: string;
  joinedAt?: string;
  lastActiveAt?: string;
}

export interface LearningProfile {
  arabicLevel?: string;
  quranLevel?: string;
  quranReadingLevel?: string;
  quranUnderstandingLevel?: string;
  hifzLevel?: string;
  preferredLearningStyle?: string;
  weakAreas: string[];
  strongAreas: string[];
  currentArabicPath?: string;
  currentQuranPath?: string;
  completedLessons: string[];
  missedLessons: string[];
  reviewDueItems: string[];
  currentLearningPath?: string;
}

export interface WorshipProfile {
  prayerConsistency?: number;
  fajrFocus?: string;
  quranReadingStreak?: number;
  dhikrConsistency?: number;
  tasbeehUsage?: string;
  fastingInterest?: string;
  salahFocus?: string;
  currentWorshipGoal?: string;
  missedHabitPatterns: string[];
}

export interface AppBehaviorProfile {
  mostUsedFeatures: string[];
  leastUsedFeatures: string[];
  lastOpenedScreen?: string;
  lastQuranLocation?: string;
  lastArabicLesson?: string;
  lastHifzSession?: string;
  lastDuaCategory?: string;
  lastAIConversationTopic?: string;
  dailyActivePattern?: string;
  preferredOpenTime?: string;
}

export interface AIPreferenceProfile {
  answerLengthPreference?: AIResponseLength;
  prefersShortAnswers?: boolean;
  prefersDetailedAnswers?: boolean;
  prefersPracticalSteps?: boolean;
  prefersReflection?: boolean;
  prefersArabicSupport?: boolean;
  prefersQuranFocus?: boolean;
  prefersSources?: boolean;
  languagePreference?: string;
  tonePreference?: string;
  scholarModePreference?: boolean;
}

export interface AISubscriptionContext {
  plan: NurAIPlanTier;
  aiDailyLimit: number | null;
  contextualDailyLimit: number | null;
  enabledAIModes: AIModeId[];
  premiumUnlocked: boolean;
  scholarUnlocked: boolean;
  premiumFeaturesUnlocked?: boolean;
  scholarFeaturesUnlocked?: boolean;
}

export interface RetentionProfile {
  streaks: string[];
  activeStreaks?: string[];
  atRiskStreaks?: string[];
  weeklyProgress: string[];
  milestonesNear: string[];
  abandonedJourneys: string[];
  recommendedNextAction?: string;
  lastRecommendationShown?: string;
  lastRecommendationActedOn?: string;
}

export interface MuslimGrowthProfile {
  version: 1;
  updatedAt: string;
  identity: IdentityGoalProfile;
  goals: MuslimGrowthGoal[];
  learningProfile: LearningProfile;
  worshipProfile: WorshipProfile;
  appBehavior: AppBehaviorProfile;
  aiPreference: AIPreferenceProfile;
  subscriptionContext: AISubscriptionContext;
  retentionProfile: RetentionProfile;
  privacyBoundaries: string[];
}

export type AIMemoryLayerId =
  | "session"
  | "recent_activity"
  | "long_term_preference"
  | "learning"
  | "recommendation"
  | "safety";

export interface AIMemoryLayerSummary {
  id: AIMemoryLayerId;
  label: string;
  summary: string[];
  retention: "temporary" | "recent" | "stable" | "safety_limited";
}

export interface SafeAIMemorySummary {
  version: 1;
  updatedAt: string;
  session: string[];
  recentActivity: string[];
  learning: string[];
  worship: string[];
  goals: string[];
  preferences: string[];
  currentFocus: string[];
  weakAreas: string[];
  strongAreas: string[];
  featurePatterns: string[];
  recommendations: string[];
  safety: string[];
  cautions: string[];
  layers: AIMemoryLayerSummary[];
}

export interface AIActionSuggestion {
  label: string;
  route?: string;
  reason?: string;
}

export type PersonalAISurface =
  | "home"
  | "chat"
  | "quran"
  | "arabic"
  | "hifz"
  | "prayer"
  | "duas"
  | "library"
  | "family"
  | "travel"
  | "weather"
  | "tasbeeh"
  | "womens_health"
  | "ramadan"
  | "community"
  | "contextual";

export type PersonalAIIntent =
  | "answer"
  | "explain"
  | "coach"
  | "plan"
  | "reflect"
  | "review"
  | "navigate"
  | "handoff";

export type PersonalAIActionKind =
  | "open_feature"
  | "ask_followup"
  | "save"
  | "plan"
  | "prepare"
  | "review"
  | "set_reminder"
  | "scholar_handoff";

export interface PersonalAIActionCapability extends AIActionSuggestion {
  id: string;
  kind: PersonalAIActionKind;
  minimumTier: NurAIPlanTier;
  requiresConfirmation: boolean;
  safetyNote?: string;
}

export interface PersonalAIPersonaContract {
  name: "Personal AI";
  voice: "calm" | "gentle" | "accountability" | "scholar";
  relationship: "companion" | "coach" | "tutor" | "study_partner";
  styleRules: string[];
  forbiddenClaims: string[];
}

export interface PersonalAITrustContract {
  privacyBoundaries: string[];
  memoryBoundaries: string[];
  sourceBoundaries: string[];
  sensitiveEscalations: string[];
}

export interface SourceTrustCard {
  state: AITrustState;
  label: string;
  sourceType?: "quran" | "hadith" | "tafsir" | "app_content" | "scholar_review";
  reference?: string;
  note: string;
}

export interface NurAIResponseContract {
  answer: string;
  explanation?: string;
  verifiedSources: string[];
  sourceCards: SourceTrustCard[];
  trustState: AITrustState;
  aiExplanation?: string;
  caution?: string;
  practicalAction?: string;
  actionSuggestions: AIActionSuggestion[];
  confidence: "low" | "medium" | "high";
}

export interface PersonalAIActionPlanContract {
  primary: PersonalAIActionCapability;
  secondary: PersonalAIActionCapability[];
  blocked: PersonalAIActionCapability[];
}

export interface PersonalAIGuidanceContract {
  version: 1;
  surface: PersonalAISurface;
  intent: PersonalAIIntent;
  modeId: AIModeId;
  actionPlan: PersonalAIActionPlanContract;
  contextSummary: string;
  generatedAt: string;
}

export interface AIModeAccessRule {
  minimumTier: NurAIPlanTier;
  freeDailyLimit?: number;
  premiumDailyLimit?: number;
  scholarDailyLimit?: number;
}

export interface AIModeDefinitionContract {
  id: AIModeId;
  label: string;
  description: string;
  access: AIModeAccessRule;
  safetyCategory: AIModeSafetyCategory;
  sourceRule: AIModeSourceRule;
  modelTier: AIModelRoutingTier;
  memoryAccess: AIMemoryAccessLevel;
  responseFormat: AIResponseFormat;
  suggestedActions: string[];
}

export type AIModeInferenceConfidence = "low" | "medium" | "high";

export interface AIModeInferenceResult {
  modeId: AIModeId;
  confidence: AIModeInferenceConfidence;
  reasons: string[];
  explicit: boolean;
}
