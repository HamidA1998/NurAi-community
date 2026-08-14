import { Book, PlanType } from "@/types/library";

const PLAN_WEIGHT: Record<PlanType, number> = {
  free: 0,
  premium: 1,
  scholar: 2,
};

export function canAccessPlan(
  userPlan: PlanType,
  requiredPlan: PlanType,
): boolean {
  return PLAN_WEIGHT[userPlan] >= PLAN_WEIGHT[requiredPlan];
}

export function canAccessBook(userPlan: PlanType, book: Book): boolean {
  return canAccessPlan(userPlan, book.requiredPlan);
}

export function canAccessChapter(
  userPlan: PlanType,
  book: Book,
  chapterId: string,
): boolean {
  if (canAccessBook(userPlan, book)) return true;
  return book.previewChapterIds.includes(chapterId);
}

export function canReviewLibrarySources(userPlan: PlanType): boolean {
  return userPlan === "scholar";
}

export function getBookLockedReason(book: Book): string {
  if (book.requiredPlan === "premium") {
    return "Premium unlocks the full interactive book, quizzes, reflections and study progress.";
  }
  if (book.requiredPlan === "scholar") {
    return "Scholar unlocks advanced study paths, deeper notes and source-card study tools.";
  }
  return "";
}

export function getUpgradeTarget(
  requiredPlan: PlanType,
): "Premium" | "Scholar" | null {
  if (requiredPlan === "premium") return "Premium";
  if (requiredPlan === "scholar") return "Scholar";
  return null;
}

export function getPlanLabel(plan: PlanType): string {
  if (plan === "scholar") return "Scholar";
  if (plan === "premium") return "Premium";
  return "Free";
}
