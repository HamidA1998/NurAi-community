import assert from "node:assert/strict";

import {
  buildScholarSourcePack,
  classifyScholarQuestion,
} from "../server/ai/scholarAgent";

const cryptoQuestion =
  "Fiqh of crypto for UK reverts? I follow Hanafi but want to know where scholars differ.";

const classification = classifyScholarQuestion({
  question: cryptoQuestion,
  madhhab: "hanafi",
  jurisdiction: "GB",
  userLevel: "beginner",
  isRevert: true,
});

assert.equal(classification.primaryTopic, "islamic_finance");
assert.equal(classification.requiresScholarCare, true);
assert.deepEqual(classification.madhhabFilters, ["hanafi"]);
assert.deepEqual(classification.jurisdictionFilters, ["GB"]);

const sourcePack = buildScholarSourcePack(classification);

assert.ok(
  sourcePack.sources.length >= 3,
  "crypto/UK finance question should retrieve multiple verified source cards",
);
assert.ok(
  sourcePack.sources.some((source) => source.madhhabTags.includes("hanafi")),
  "source pack should include at least one Hanafi-aware source card",
);
assert.ok(
  sourcePack.sources.some((source) => source.jurisdictionTags.includes("GB")),
  "source pack should include at least one UK-aware source card",
);
assert.equal(sourcePack.coverage, "verified_context");
assert.match(sourcePack.systemBoundary, /not a fatwa/i);
assert.match(sourcePack.answerInstructions.join("\n"), /cite/i);

const unsupported = classifyScholarQuestion({
  question: "Can you decide my exact divorce case?",
  madhhab: "maliki",
  jurisdiction: "US",
  userLevel: "advanced",
  isRevert: false,
});
const unsupportedPack = buildScholarSourcePack(unsupported);

assert.equal(unsupported.requiresScholarCare, true);
assert.equal(unsupportedPack.coverage, "needs_source_review");
assert.equal(unsupportedPack.sources.length, 0);
assert.ok(unsupportedPack.failClosedMessage);
assert.match(unsupportedPack.failClosedMessage, /qualified scholar/i);

const quranicArabicPack = buildScholarSourcePack(
  classifyScholarQuestion({
    question:
      "Help me learn Quranic Arabic word meanings and roots without guessing.",
    userLevel: "beginner",
  }),
);

assert.ok(
  quranicArabicPack.sources.some((source) => source.reference === "Quran 12:2"),
  "Quranic Arabic pack should include Quran 12:2",
);
assert.ok(
  quranicArabicPack.sources.some((source) => source.reference === "Quran 41:3"),
  "Quranic Arabic pack should include Quran 41:3",
);
assert.ok(
  quranicArabicPack.sources.some(
    (source) => source.reference === "NurAI Quran learning source policy",
  ),
  "Quranic Arabic pack should include the word-intelligence boundary",
);
assert.notEqual(quranicArabicPack.coverage, "needs_source_review");

const recitationPack = buildScholarSourcePack(
  classifyScholarQuestion({
    question: "Build a tajweed and tarteel recitation coach for memorisation.",
    userLevel: "intermediate",
  }),
);

assert.ok(
  recitationPack.sources.some((source) => source.reference === "Quran 73:4"),
  "Recitation pack should include Quran 73:4",
);
assert.ok(
  recitationPack.sources.some(
    (source) => source.reference === "Sahih al-Bukhari 5027",
  ),
  "Recitation pack should include Sahih al-Bukhari 5027",
);
assert.notEqual(recitationPack.coverage, "needs_source_review");

console.log("Scholar agent eval passed.");
