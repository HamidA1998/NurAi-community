import { syncedGetItem, syncedSetItem } from "@/lib/progress-sync";

export const SAVED_AI_ANSWERS_KEY = "nurai_saved_ai_answers_v1";

export type SavedAIAnswerSourceStatus =
  | "verified_context"
  | "reference_detected"
  | "limited_context"
  | "needs_source_review"
  | "source_aware";

export type SavedAIAnswerInput = {
  title?: string;
  question?: string;
  answer: string;
  answerMode?: string;
  featureLabel?: string;
  trustSummary: string;
  sourceStatus: string;
  sourceCoverage?: SavedAIAnswerSourceStatus | string;
  sourceRefs?: string[];
  sourceGaps?: string[];
  followUpPrompts?: string[];
  actionSteps?: string[];
  learningPlan?: string[];
  scholarReviewRecommended?: boolean;
  warning?: string;
};

export type SavedAIAnswer = Required<
  Pick<
    SavedAIAnswerInput,
    | "answer"
    | "trustSummary"
    | "sourceStatus"
    | "sourceRefs"
    | "sourceGaps"
    | "followUpPrompts"
    | "actionSteps"
    | "learningPlan"
    | "scholarReviewRecommended"
  >
> & {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  question: string;
  answerMode: string;
  featureLabel: string;
  sourceCoverage: string;
  warning?: string;
};

export type SavedAIAnswerSummary = {
  total: number;
  sourceAware: number;
  needsSourceReview: number;
  scholarReviewRecommended: number;
};

export type SavedAIAnswerNextAction = {
  id: "scholar_review" | "source_follow_up" | "study_plan";
  title: string;
  body: string;
  actionLabel: string;
  tone: "scholar" | "attention" | "primary";
};

function clampText(value: unknown, fallback: string, maxLength: number) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  const resolved = text || fallback;
  return resolved.length > maxLength
    ? `${resolved.slice(0, maxLength - 3).trim()}...`
    : resolved;
}

function normalizeList(values: unknown, maxItems = 8, maxLength = 180) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => clampText(value, "", maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function savedAnswerId() {
  return `saved_ai_answer_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function titleFromAnswer(answer: string, fallback: string) {
  const firstLine =
    answer
      .split(/\n/)
      .map((line) => line.replace(/^#+\s*/, "").trim())
      .find(Boolean) || fallback;
  return clampText(firstLine, fallback, 86);
}

export function buildAIAnswerLearningPlan(
  input: Pick<
    SavedAIAnswerInput,
    | "actionSteps"
    | "followUpPrompts"
    | "scholarReviewRecommended"
    | "sourceGaps"
  >,
) {
  const firstAction = normalizeList(input.actionSteps, 1, 160)[0];
  const firstFollowUp = normalizeList(input.followUpPrompts, 1, 160)[0];
  const hasSourceGaps = normalizeList(input.sourceGaps, 1, 160).length > 0;

  return [
    "Revisit the saved answer with its source status before acting on it.",
    firstAction || "Write one reflection or action you can practise today.",
    input.scholarReviewRecommended
      ? "Create or share a scholar review packet before treating this as a ruling."
      : hasSourceGaps
        ? "Ask a source-focused follow-up before relying on details beyond the cards."
        : firstFollowUp || "Ask one follow-up to turn the answer into study.",
  ];
}

export function aiSavedAnswerReadinessIssues(
  input: SavedAIAnswerInput,
): string[] {
  const issues: string[] = [];
  const learningPlan =
    input.learningPlan && input.learningPlan.length >= 3
      ? normalizeList(input.learningPlan, 4, 180)
      : buildAIAnswerLearningPlan(input);

  if (clampText(input.answer, "", 4000).length < 24) {
    issues.push("Saved AI answers need the answer text.");
  }
  if (clampText(input.trustSummary, "", 240).length < 10) {
    issues.push("Saved AI answers need a trust or uncertainty summary.");
  }
  if (clampText(input.sourceStatus, "", 220).length < 8) {
    issues.push("Saved AI answers need a source status.");
  }
  if (learningPlan.length < 3) {
    issues.push("Saved AI answers need at least three learning plan steps.");
  }

  return issues;
}

export function buildSavedAIAnswer(input: SavedAIAnswerInput): SavedAIAnswer {
  const now = new Date().toISOString();
  const learningPlan =
    input.learningPlan && input.learningPlan.length >= 3
      ? normalizeList(input.learningPlan, 4, 180)
      : buildAIAnswerLearningPlan(input);
  const answer = clampText(input.answer, "NurAI answer", 5000);
  const featureLabel = clampText(input.featureLabel, "NurAI", 80);

  return {
    id: savedAnswerId(),
    createdAt: now,
    updatedAt: now,
    title: clampText(
      input.title,
      titleFromAnswer(answer, `${featureLabel} saved answer`),
      90,
    ),
    question: clampText(
      input.question,
      "Original question not captured in this view.",
      500,
    ),
    answer,
    answerMode: clampText(input.answerMode, "Saved answer", 60),
    featureLabel,
    trustSummary: clampText(input.trustSummary, "Source-aware answer", 260),
    sourceStatus: clampText(input.sourceStatus, "Source-aware", 220),
    sourceCoverage: clampText(input.sourceCoverage, "source_aware", 80),
    sourceRefs: normalizeList(input.sourceRefs, 10, 120),
    sourceGaps: normalizeList(input.sourceGaps, 6, 200),
    followUpPrompts: normalizeList(input.followUpPrompts, 6, 220),
    actionSteps: normalizeList(input.actionSteps, 6, 180),
    learningPlan,
    scholarReviewRecommended: Boolean(input.scholarReviewRecommended),
    warning: input.warning ? clampText(input.warning, "", 260) : undefined,
  };
}

function normalizeSavedAIAnswer(raw: any): SavedAIAnswer | null {
  if (!raw || typeof raw !== "object") return null;
  const id = clampText(raw.id, "", 120);
  const createdAt = clampText(raw.createdAt, "", 40);
  if (!id || !createdAt) return null;

  return {
    ...buildSavedAIAnswer({
      title: raw.title,
      question: raw.question,
      answer: raw.answer,
      answerMode: raw.answerMode,
      featureLabel: raw.featureLabel,
      trustSummary: raw.trustSummary,
      sourceStatus: raw.sourceStatus,
      sourceCoverage: raw.sourceCoverage,
      sourceRefs: raw.sourceRefs,
      sourceGaps: raw.sourceGaps,
      followUpPrompts: raw.followUpPrompts,
      actionSteps: raw.actionSteps,
      learningPlan: raw.learningPlan,
      scholarReviewRecommended: raw.scholarReviewRecommended,
      warning: raw.warning,
    }),
    id,
    createdAt,
    updatedAt: clampText(raw.updatedAt, createdAt, 40),
  };
}

export async function listSavedAIAnswers(): Promise<SavedAIAnswer[]> {
  const raw = await syncedGetItem(SAVED_AI_ANSWERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeSavedAIAnswer)
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = new Date(a!.createdAt).getTime();
        const bTime = new Date(b!.createdAt).getTime();
        return bTime - aTime;
      }) as SavedAIAnswer[];
  } catch {
    return [];
  }
}

export async function saveAIAnswer(
  input: SavedAIAnswerInput,
): Promise<SavedAIAnswer> {
  const issues = aiSavedAnswerReadinessIssues(input);
  if (issues.length > 0) {
    throw new Error(issues.join(" "));
  }

  const saved = buildSavedAIAnswer(input);
  const existing = await listSavedAIAnswers();
  await syncedSetItem(
    SAVED_AI_ANSWERS_KEY,
    JSON.stringify([saved, ...existing].slice(0, 80)),
  );
  return saved;
}

export async function deleteSavedAIAnswer(
  id: string,
): Promise<SavedAIAnswer[]> {
  const existing = await listSavedAIAnswers();
  const next = existing.filter((answer) => answer.id !== id);
  await syncedSetItem(SAVED_AI_ANSWERS_KEY, JSON.stringify(next));
  return next;
}

export function summarizeSavedAIAnswers(
  answers: SavedAIAnswer[],
): SavedAIAnswerSummary {
  return answers.reduce<SavedAIAnswerSummary>(
    (summary, answer) => ({
      total: summary.total + 1,
      sourceAware:
        answer.sourceRefs.length > 0 || answer.sourceStatus
          ? summary.sourceAware + 1
          : summary.sourceAware,
      needsSourceReview:
        answer.sourceGaps.length > 0 ||
        answer.sourceCoverage === "needs_source_review"
          ? summary.needsSourceReview + 1
          : summary.needsSourceReview,
      scholarReviewRecommended: answer.scholarReviewRecommended
        ? summary.scholarReviewRecommended + 1
        : summary.scholarReviewRecommended,
    }),
    {
      total: 0,
      sourceAware: 0,
      needsSourceReview: 0,
      scholarReviewRecommended: 0,
    },
  );
}

export function buildSavedAIAnswerNextAction(
  answer: SavedAIAnswer,
): SavedAIAnswerNextAction {
  if (answer.scholarReviewRecommended) {
    return {
      id: "scholar_review",
      title: "Scholar review first",
      body: "Treat this as study notes until a qualified reviewer checks the exact question and context.",
      actionLabel: "Create review",
      tone: "scholar",
    };
  }

  if (
    answer.sourceGaps.length > 0 ||
    answer.sourceCoverage === "needs_source_review"
  ) {
    return {
      id: "source_follow_up",
      title: "Ask a source follow-up",
      body:
        answer.sourceGaps[0] ||
        "Resolve the source status before relying on extra details.",
      actionLabel: "Follow-up",
      tone: "attention",
    };
  }

  return {
    id: "study_plan",
    title: "Continue the study plan",
    body:
      answer.learningPlan[0] ||
      "Revisit the saved answer with sources, then practise one small step.",
    actionLabel: "Study next",
    tone: "primary",
  };
}

export function buildSavedAIAnswerShareText(answer: SavedAIAnswer): string {
  const sourceRefs =
    answer.sourceRefs.length > 0
      ? answer.sourceRefs.join(", ")
      : "No source cards attached";
  const sourceGaps =
    answer.sourceGaps.length > 0
      ? `\n\nSource gaps:\n${answer.sourceGaps.map((gap) => `- ${gap}`).join("\n")}`
      : "";
  const learningPlan = answer.learningPlan
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n");
  const nextAction = buildSavedAIAnswerNextAction(answer);

  return [
    answer.title,
    "",
    answer.answer,
    "",
    `Trust summary: ${answer.trustSummary}`,
    `Source status: ${answer.sourceStatus}`,
    `Source refs: ${sourceRefs}`,
    sourceGaps,
    "",
    `Next action: ${nextAction.title} - ${nextAction.body}`,
    "",
    "Learning plan:",
    learningPlan,
    answer.scholarReviewRecommended
      ? "\nScholar review recommended before treating this as a ruling."
      : "",
    "\nSaved in NurAI",
  ]
    .filter(Boolean)
    .join("\n");
}
