#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(
  text: string,
  needle: string,
  label: string,
  findings: string[],
) {
  if (!text.includes(needle)) findings.push(`${label}: missing ${needle}`);
}

function main() {
  const findings: string[] = [];
  const audioPathService = read("client/services/libraryAudioPathService.ts");
  const learningPathService = read(
    "client/services/libraryLearningPathService.ts",
  );
  const narrationService = read("client/services/libraryNarrationService.ts");
  const libraryHome = read("client/screens/LibraryHomeScreen.tsx");
  const bookReader = read("client/screens/BookReaderScreen.tsx");
  const roadmap = read("client/data/ummahProductRoadmap.ts");
  const packageJson = JSON.parse(read("package.json")) as {
    scripts?: Record<string, string>;
  };

  for (const [needle, label] of [
    ["export type LibraryAudioPathTrack", "Audio path track contract"],
    ["export type LibraryAudioPathPlan", "Audio path plan contract"],
    ["export type LibraryAudioPathCheckpoint", "Audio checkpoint contract"],
    ["export type LibraryAudioPathSummary", "Audio summary contract"],
    ["buildLibraryAudioPathPlans", "Audio plan builder"],
    ["summarizeLibraryAudioPathPlans", "Audio summary builder"],
    ["buildGuidedLibraryPaths(progressByBook)", "Guided path integration"],
    ["audioScriptAvailable", "Narration script readiness"],
    ["offlineEligible", "Offline eligibility"],
    ["sourceBoundaryLabel", "Source boundary label"],
    ["transcriptBoundaryLabel", "Transcript boundary label"],
    ["rightsBoundaryLabel", "Rights boundary label"],
    ["reviewBoundaryLabel", "Review boundary label"],
    ["needs_scholar_review", "High-care scholar review status"],
    ["needs_source_review", "Source review status"],
    ["listen-read-reflect rhythm", "Audio learning cadence"],
    ["not copied third-party lectures", "Third-party lecture rights boundary"],
    [
      "Keep audio paths framed as study narration until review evidence is complete.",
      "No-overclaim release boundary",
    ],
  ] as const) {
    requireIncludes(audioPathService, needle, label, findings);
  }

  for (const [needle, label] of [
    ["export type GuidedLibraryPathStudySession", "Guided study sessions"],
    ["weeklyPlan: GuidedLibraryPathWeeklyPlan", "Weekly guided plan"],
    ["certificateGate: GuidedLibraryPathCertificateGate", "Certificate gate"],
    ["Certificate locked by proof gates", "Certificate proof boundary"],
  ] as const) {
    requireIncludes(learningPathService, needle, label, findings);
  }

  for (const [needle, label] of [
    ["downloadLibraryNarration", "Offline narration download"],
    ["getLibraryNarrationUri", "Narration URI loader"],
    ["getLibraryNarrationDownloadEntries", "Downloaded narration index"],
    [
      "Premium unlocks chapter narration and offline playback.",
      "Premium narration boundary",
    ],
    ["/api/audio/tts", "Server TTS route"],
  ] as const) {
    requireIncludes(narrationService, needle, label, findings);
  }

  for (const [needle, label] of [
    ["buildLibraryAudioPathPlans", "Library Home audio path plans"],
    ["summarizeLibraryAudioPathPlans", "Library Home audio summary"],
    ["audioPathSummary", "Library Home audio summary state"],
    ["activeAudioPath", "Library Home active audio path"],
    ["nextAudioTrack", "Library Home next audio track"],
    ["LISTEN, READ, REFLECT", "Library Home audio readiness label"],
    [
      'testID="library-audio-path-readiness"',
      "Library Home audio readiness test id",
    ],
    [
      "testID={`library-audio-checkpoint-${checkpoint.id}`}",
      "Library Home audio checkpoint test id",
    ],
    [
      'testID="button-library-audio-next-track"',
      "Library Home audio next track action",
    ],
    [
      "audioPathSummary.releaseBoundaryLabel",
      "Library Home audio release boundary",
    ],
    [
      "activeAudioPath.rightsBoundaryLabel",
      "Library Home audio rights boundary",
    ],
    [
      "nextAudioTrack.sourceBoundaryLabel",
      "Library Home audio source boundary",
    ],
  ] as const) {
    requireIncludes(libraryHome, needle, label, findings);
  }

  for (const [needle, label] of [
    ["Chapter narration", "Book reader audio card"],
    ["chapter.audioScript", "Book reader script gate"],
    ["downloadLibraryNarration", "Book reader offline download action"],
    [
      "This chapter does not have a narration script yet",
      "Missing script fallback",
    ],
    ["Premium unlocks offline chapter narration", "Offline premium boundary"],
    ["chapter.quiz.map", "Lesson quiz rendering"],
  ] as const) {
    requireIncludes(bookReader, needle, label, findings);
  }

  for (const [needle, label] of [
    ['id: "structured-islamic-learning-audio"', "Roadmap item"],
    ['status: "partially-built"', "Roadmap partial status"],
    [
      "client/services/libraryAudioPathService.ts",
      "Roadmap audio path evidence",
    ],
    [
      "scripts/check-library-audio-paths-release.ts",
      "Roadmap release check evidence",
    ],
    ["npm run check:library-audio-paths-release", "Roadmap command evidence"],
  ] as const) {
    requireIncludes(roadmap, needle, label, findings);
  }

  const releaseLocal = packageJson.scripts?.["check:release-local"] || "";
  if (!packageJson.scripts?.["check:library-audio-paths-release"]) {
    findings.push("package.json: missing check:library-audio-paths-release");
  }
  if (!releaseLocal.includes("check:library-audio-paths-release")) {
    findings.push(
      "package.json: check:release-local must run the Library audio paths release check",
    );
  }

  if (findings.length > 0) {
    console.error(
      `Library audio paths release check failed with ${findings.length} finding(s):`,
    );
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Library audio paths release check passed: guided path audio plans, narration/offline controls, source boundaries, rights boundaries, and roadmap evidence verified.",
  );
}

main();
