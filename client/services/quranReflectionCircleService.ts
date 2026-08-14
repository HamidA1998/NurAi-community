import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "@/lib/progress-sync";

export const QURAN_REFLECTION_CIRCLES_KEY = "quran_reflection_circles_v1";
export const QURAN_REFLECTION_CIRCLE_DRAFTS_KEY =
  "quran_reflection_circle_drafts_v1";

export type QuranReflectionCirclePrivacy =
  | "private"
  | "family"
  | "teacher"
  | "moderated";

export type QuranReflectionCircleStatus =
  | "draft"
  | "open"
  | "paused"
  | "archived";

export type QuranCircleReflectionStatus =
  | "private_note"
  | "pending_review"
  | "approved"
  | "needs_revision";

export type QuranReflectionCircleMemberRole =
  | "owner"
  | "teacher"
  | "moderator"
  | "member";

export type QuranReflectionCircleAyahRef = {
  surahNumber: number;
  ayahNumber: number;
  surahName?: string;
  translationSnippet?: string;
};

export type QuranReflectionCircleMember = {
  id: string;
  displayName: string;
  role: QuranReflectionCircleMemberRole;
  joinedAt: string;
};

export type QuranReflectionCircle = {
  id: string;
  title: string;
  privacy: QuranReflectionCirclePrivacy;
  status: QuranReflectionCircleStatus;
  ayahRefs: QuranReflectionCircleAyahRef[];
  members: QuranReflectionCircleMember[];
  prompts: string[];
  moderationPolicy: string;
  sourceBoundary: string;
  authorityBoundary: string;
  createdAt: string;
  updatedAt: string;
};

export type QuranCircleReflectionDraft = {
  id: string;
  circleId: string;
  ayahRef: QuranReflectionCircleAyahRef;
  authorLabel: string;
  reflection: string;
  status: QuranCircleReflectionStatus;
  visibility: "only_me" | "circle_after_review";
  sourceBoundaryLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type QuranReflectionCircleSummary = {
  total: number;
  open: number;
  private: number;
  moderated: number;
  pendingReviewDrafts: number;
  nextActionLabel: string;
};

export type QuranReflectionCircleSafetyItem = {
  id: string;
  label: string;
  required: boolean;
  satisfied: boolean;
  body: string;
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function compactText(value: unknown, maxLength: number): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatQuranCircleAyahRef(ref: QuranReflectionCircleAyahRef) {
  const name = compactText(ref.surahName, 80);
  return `${name ? `${name} ` : ""}${ref.surahNumber}:${ref.ayahNumber}`;
}

export function buildQuranReflectionCirclePrompt(
  ref: QuranReflectionCircleAyahRef,
): string {
  return `After reading Quran ${ref.surahNumber}:${ref.ayahNumber}, write one personal reflection, one question, and one action. Keep it as reflection, not a ruling.`;
}

export function buildQuranReflectionCircleSafetyChecklist(input: {
  circle?: QuranReflectionCircle | null;
  draft?: QuranCircleReflectionDraft | null;
}): QuranReflectionCircleSafetyItem[] {
  const circle = input.circle || null;
  const draft = input.draft || null;
  return [
    {
      id: "private_by_default",
      label: "Private by default",
      required: true,
      satisfied:
        Boolean(circle && circle.privacy !== "moderated") || Boolean(draft),
      body: "Reflection starts private or circle-only so personal worship notes are not public by default.",
    },
    {
      id: "moderation_before_sharing",
      label: "Moderation before sharing",
      required: true,
      satisfied:
        !draft ||
        draft.visibility === "only_me" ||
        draft.status === "pending_review" ||
        draft.status === "approved",
      body: "Circle-visible reflections use pending review or approval before they are treated as shared learning.",
    },
    {
      id: "not_religious_authority",
      label: "Not religious authority",
      required: true,
      satisfied: Boolean(
        circle?.authorityBoundary.includes("not scholarship") ||
          draft?.sourceBoundaryLabel.includes("not scholarship"),
      ),
      body: "Reflection cards must not make popularity, likes, or personal impressions look like scholarship.",
    },
    {
      id: "source_boundary_visible",
      label: "Source boundary visible",
      required: true,
      satisfied: Boolean(circle?.sourceBoundary || draft?.sourceBoundaryLabel),
      body: "Every reflection circle keeps Quran reference, tafsir/source limits, and non-fatwa boundaries visible.",
    },
  ];
}

export async function listQuranReflectionCircles(): Promise<
  QuranReflectionCircle[]
> {
  return readJson<QuranReflectionCircle[]>(QURAN_REFLECTION_CIRCLES_KEY, []);
}

export async function saveQuranReflectionCircle(input: {
  title: string;
  privacy?: QuranReflectionCirclePrivacy;
  ayahRefs: QuranReflectionCircleAyahRef[];
  members?: QuranReflectionCircleMember[];
  prompts?: string[];
  status?: QuranReflectionCircleStatus;
}): Promise<QuranReflectionCircle> {
  const current = await listQuranReflectionCircles();
  const now = new Date().toISOString();
  const id = createId("quran-circle");
  const ayahRefs = input.ayahRefs.slice(0, 12);
  const circle: QuranReflectionCircle = {
    id,
    title: compactText(input.title, 90) || "Quran reflection circle",
    privacy: input.privacy || "private",
    status: input.status || "open",
    ayahRefs,
    members: (input.members || []).slice(0, 40),
    prompts:
      input.prompts?.slice(0, 6).map((prompt) => compactText(prompt, 180)) ||
      ayahRefs.slice(0, 3).map(buildQuranReflectionCirclePrompt),
    moderationPolicy:
      "Circle-visible reflections stay pending until a parent, teacher, or moderator approves them.",
    sourceBoundary:
      "Attach Quran references and keep tafsir, fiqh, and personal rulings out of casual reflection unless reviewed.",
    authorityBoundary:
      "A reflection circle is personal learning and family discussion, not scholarship, fatwa, or public religious authority.",
    createdAt: now,
    updatedAt: now,
  };
  const updated = [circle, ...current].slice(0, 80);
  await syncedSetItem(QURAN_REFLECTION_CIRCLES_KEY, JSON.stringify(updated));
  return circle;
}

export async function listQuranCircleReflectionDrafts(
  circleId?: string,
): Promise<QuranCircleReflectionDraft[]> {
  const drafts = await readJson<QuranCircleReflectionDraft[]>(
    QURAN_REFLECTION_CIRCLE_DRAFTS_KEY,
    [],
  );
  if (!circleId) return drafts;
  return drafts.filter((draft) => draft.circleId === circleId);
}

export async function saveQuranCircleReflectionDraft(input: {
  circleId: string;
  ayahRef: QuranReflectionCircleAyahRef;
  authorLabel?: string;
  reflection: string;
  visibility?: QuranCircleReflectionDraft["visibility"];
}): Promise<QuranCircleReflectionDraft> {
  const current = await listQuranCircleReflectionDrafts();
  const now = new Date().toISOString();
  const visibility = input.visibility || "only_me";
  const draft: QuranCircleReflectionDraft = {
    id: createId("quran-reflection"),
    circleId: input.circleId,
    ayahRef: input.ayahRef,
    authorLabel: compactText(input.authorLabel, 80) || "NurAI learner",
    reflection: compactText(input.reflection, 1600),
    status: visibility === "only_me" ? "private_note" : "pending_review",
    visibility,
    sourceBoundaryLabel:
      "Personal Quran reflection attached to an ayah; not scholarship, tafsir, or a final ruling.",
    createdAt: now,
    updatedAt: now,
  };
  const updated = [draft, ...current].slice(0, 500);
  await syncedSetItem(
    QURAN_REFLECTION_CIRCLE_DRAFTS_KEY,
    JSON.stringify(updated),
  );
  return draft;
}

export async function updateQuranCircleReflectionStatus(
  draftId: string,
  status: QuranCircleReflectionStatus,
): Promise<QuranCircleReflectionDraft[]> {
  const current = await listQuranCircleReflectionDrafts();
  const updated = current.map((draft) =>
    draft.id === draftId
      ? {
          ...draft,
          status,
          updatedAt: new Date().toISOString(),
        }
      : draft,
  );
  await syncedSetItem(
    QURAN_REFLECTION_CIRCLE_DRAFTS_KEY,
    JSON.stringify(updated),
  );
  return updated;
}

export function summarizeQuranReflectionCircles(input: {
  circles: QuranReflectionCircle[];
  drafts: QuranCircleReflectionDraft[];
}): QuranReflectionCircleSummary {
  const open = input.circles.filter(
    (circle) => circle.status === "open",
  ).length;
  const privateCount = input.circles.filter(
    (circle) => circle.privacy === "private",
  ).length;
  const moderated = input.circles.filter(
    (circle) => circle.privacy === "moderated" || circle.privacy === "teacher",
  ).length;
  const pendingReviewDrafts = input.drafts.filter(
    (draft) => draft.status === "pending_review",
  ).length;
  const nextActionLabel =
    pendingReviewDrafts > 0
      ? "Review pending reflections"
      : open > 0
        ? "Add today's ayah reflection"
        : "Create a private Quran circle";

  return {
    total: input.circles.length,
    open,
    private: privateCount,
    moderated,
    pendingReviewDrafts,
    nextActionLabel,
  };
}

export async function getQuranReflectionCircleSummary() {
  const [circles, drafts] = await Promise.all([
    listQuranReflectionCircles(),
    listQuranCircleReflectionDrafts(),
  ]);
  return summarizeQuranReflectionCircles({ circles, drafts });
}
