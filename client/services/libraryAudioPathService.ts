import { buildGuidedLibraryPaths } from "@/services/libraryLearningPathService";
import type { Book, Chapter, UserBookProgress } from "@/types/library";

export type LibraryAudioPathTrackStatus =
  | "ready_to_listen"
  | "needs_script"
  | "needs_source_review"
  | "needs_scholar_review";

export type LibraryAudioPathTrack = {
  id: string;
  bookId: string;
  chapterId: string;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  audioScriptAvailable: boolean;
  sourceRefCount: number;
  verifiedSourceRefCount: number;
  highCare: boolean;
  status: LibraryAudioPathTrackStatus;
  statusLabel: string;
  sourceBoundaryLabel: string;
  transcriptBoundaryLabel: string;
  offlineEligible: boolean;
};

export type LibraryAudioPathCheckpoint = {
  id: "listen" | "source_review" | "reflect" | "quiz" | "offline";
  label: string;
  detail: string;
  complete: boolean;
};

export type LibraryAudioPathPlan = {
  id: string;
  pathTitle: string;
  cadenceLabel: string;
  nextListenActionLabel: string;
  reviewBoundaryLabel: string;
  rightsBoundaryLabel: string;
  transcriptReviewStatusLabel: string;
  totalTracks: number;
  readyTracks: number;
  offlineEligibleTracks: number;
  highCareTracks: number;
  tracks: LibraryAudioPathTrack[];
  checkpoints: LibraryAudioPathCheckpoint[];
};

export type LibraryAudioPathSummary = {
  pathCount: number;
  totalTracks: number;
  readyTracks: number;
  offlineEligibleTracks: number;
  highCareTracks: number;
  nextActionLabel: string;
  releaseBoundaryLabel: string;
};

const HIGH_CARE_CATEGORIES = new Set([
  "Worship",
  "Family",
  "Wealth & Work",
  "Reverts",
]);

function isHighCareBook(book: Book) {
  return HIGH_CARE_CATEGORIES.has(book.category);
}

function sourceReviewComplete(chapter: Chapter) {
  return (
    chapter.sourceRefs.length > 0 &&
    chapter.sourceRefs.every((source) => source.verified)
  );
}

function scholarReviewComplete(book: Book) {
  if (!isHighCareBook(book)) return true;
  return Boolean(
    book.reviewEvidence?.qualifiedScholarReviewer &&
      book.reviewEvidence?.qualifiedScholarReviewedAt &&
      book.reviewEvidence?.scholarReviewScope,
  );
}

function buildTrackStatus(
  book: Book,
  chapter: Chapter,
): LibraryAudioPathTrackStatus {
  if (!chapter.audioScript?.trim()) return "needs_script";
  if (!sourceReviewComplete(chapter)) return "needs_source_review";
  if (!scholarReviewComplete(book)) return "needs_scholar_review";
  return "ready_to_listen";
}

function trackStatusLabel(status: LibraryAudioPathTrackStatus) {
  switch (status) {
    case "ready_to_listen":
      return "Ready after review proof";
    case "needs_script":
      return "Narration script needed";
    case "needs_source_review":
      return "Source review needed";
    case "needs_scholar_review":
      return "Scholar sign-off needed";
  }
}

function buildAudioTrack(book: Book, chapter: Chapter): LibraryAudioPathTrack {
  const status = buildTrackStatus(book, chapter);
  const verifiedSourceRefCount = chapter.sourceRefs.filter(
    (source) => source.verified,
  ).length;

  return {
    id: `${book.id}:${chapter.id}`,
    bookId: book.id,
    chapterId: chapter.id,
    title: chapter.title,
    subtitle: book.title,
    estimatedMinutes: chapter.estimatedMinutes,
    audioScriptAvailable: Boolean(chapter.audioScript?.trim()),
    sourceRefCount: chapter.sourceRefs.length,
    verifiedSourceRefCount,
    highCare: isHighCareBook(book),
    status,
    statusLabel: trackStatusLabel(status),
    sourceBoundaryLabel: `${verifiedSourceRefCount}/${chapter.sourceRefs.length} source card(s) verified`,
    transcriptBoundaryLabel:
      "NurAI narration uses the in-app chapter script; treat it as study audio until human review evidence is complete.",
    offlineEligible: Boolean(chapter.audioScript?.trim()),
  };
}

function buildCheckpoints(params: {
  tracks: LibraryAudioPathTrack[];
  reflectionCount: number;
  quizCount: number;
}): LibraryAudioPathCheckpoint[] {
  const { quizCount, reflectionCount, tracks } = params;
  const readyTracks = tracks.filter(
    (track) => track.status === "ready_to_listen",
  );
  const sourceReady = tracks.every(
    (track) =>
      track.sourceRefCount > 0 &&
      track.verifiedSourceRefCount === track.sourceRefCount,
  );
  const hasOffline = tracks.some((track) => track.offlineEligible);

  return [
    {
      id: "listen",
      label: "Listen",
      detail: `${readyTracks.length}/${tracks.length} track(s) fully proof-ready`,
      complete: tracks.length > 0 && readyTracks.length === tracks.length,
    },
    {
      id: "source_review",
      label: "Source review",
      detail: sourceReady
        ? "Every track has verified source cards"
        : "Keep listening claims source-bounded",
      complete: sourceReady,
    },
    {
      id: "reflect",
      label: "Reflect",
      detail:
        reflectionCount > 0
          ? `${reflectionCount} reflection(s) saved`
          : "Save one reflection after listening",
      complete: reflectionCount > 0,
    },
    {
      id: "quiz",
      label: "Quiz",
      detail: `${quizCount} quiz question(s) available after lessons`,
      complete: quizCount > 0,
    },
    {
      id: "offline",
      label: "Offline",
      detail: hasOffline
        ? "Offline narration can be prepared for premium users"
        : "Add narration scripts before offline use",
      complete: hasOffline,
    },
  ];
}

export function buildLibraryAudioPathPlans(
  progressByBook: Record<string, UserBookProgress>,
): LibraryAudioPathPlan[] {
  return buildGuidedLibraryPaths(progressByBook).map((path) => {
    const tracks = path.books.flatMap((book) =>
      book.chapters.map((chapter) => buildAudioTrack(book, chapter)),
    );
    const readyTracks = tracks.filter(
      (track) => track.status === "ready_to_listen",
    );
    const offlineEligibleTracks = tracks.filter(
      (track) => track.offlineEligible,
    );
    const highCareTracks = tracks.filter((track) => track.highCare);
    const reflectionCount = path.reflectionCount;
    const quizCount = path.books.reduce(
      (sum, book) =>
        sum +
        book.chapters.reduce(
          (chapterSum, chapter) => chapterSum + chapter.quiz.length,
          0,
        ),
      0,
    );
    const nextTrack =
      tracks.find((track) => track.status !== "ready_to_listen") ?? tracks[0];

    return {
      id: `${path.id}-audio`,
      pathTitle: path.title,
      cadenceLabel: `${path.weeklyCadenceLabel} with listen-read-reflect rhythm`,
      nextListenActionLabel: nextTrack
        ? `Listen/read: ${nextTrack.title}`
        : "Choose a guided Library path",
      reviewBoundaryLabel:
        highCareTracks.length > 0
          ? `${highCareTracks.length} high-care track(s) keep scholar sign-off visible`
          : "Source review remains visible before certificate or publication claims",
      rightsBoundaryLabel:
        "NurAI audio paths use original in-app chapter scripts and generated narration, not copied third-party lectures.",
      transcriptReviewStatusLabel:
        readyTracks.length === tracks.length
          ? "Audio transcripts proof-ready after review evidence"
          : "Audio transcripts pending human review evidence",
      totalTracks: tracks.length,
      readyTracks: readyTracks.length,
      offlineEligibleTracks: offlineEligibleTracks.length,
      highCareTracks: highCareTracks.length,
      tracks,
      checkpoints: buildCheckpoints({
        tracks,
        reflectionCount,
        quizCount,
      }),
    };
  });
}

export function summarizeLibraryAudioPathPlans(
  plans: LibraryAudioPathPlan[],
): LibraryAudioPathSummary {
  const totalTracks = plans.reduce((sum, plan) => sum + plan.totalTracks, 0);
  const readyTracks = plans.reduce((sum, plan) => sum + plan.readyTracks, 0);
  const offlineEligibleTracks = plans.reduce(
    (sum, plan) => sum + plan.offlineEligibleTracks,
    0,
  );
  const highCareTracks = plans.reduce(
    (sum, plan) => sum + plan.highCareTracks,
    0,
  );
  const nextPlan =
    plans.find((plan) => plan.readyTracks < plan.totalTracks) ?? plans[0];

  return {
    pathCount: plans.length,
    totalTracks,
    readyTracks,
    offlineEligibleTracks,
    highCareTracks,
    nextActionLabel:
      nextPlan?.nextListenActionLabel ?? "Create an audio learning path",
    releaseBoundaryLabel:
      readyTracks === totalTracks && totalTracks > 0
        ? "Audio paths can be presented after review evidence is attached."
        : "Keep audio paths framed as study narration until review evidence is complete.",
  };
}
