import type { HomeAIFeedbackState } from "@/services/homeAIFeedbackService";

/** Pure scoring helper kept separate from AsyncStorage for release checks. */
export function homeAIFeedbackPenalty(
  feedback: HomeAIFeedbackState | null | undefined,
  key: string,
  category: string,
) {
  if (!feedback) return 0;
  const categoryPenalty = feedback.categoryWeights[category] || 0;
  const record = feedback.records[key];
  const repeatedPenalty = record
    ? record.showLessCount * -12 +
      record.notNowCount * -4 +
      record.helpfulCount * 5
    : 0;
  return categoryPenalty + repeatedPenalty;
}
