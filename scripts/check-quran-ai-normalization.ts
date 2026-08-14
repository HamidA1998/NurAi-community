#!/usr/bin/env tsx

process.env.DATABASE_URL ||= "postgresql://nurai:nurai@localhost:5432/nurai";

async function main() {
  const { normaliseQuranLearningResponse } = await import(
    "../server/replit_integrations/nurai-context/routes"
  );

  const genericStructuredResponse = [
    "Meaning: NurAI needs more verified source support before answering this safely.",
    "Context: NurAI could not attach a verified source card for every claim in this answer.",
    "Lesson: Re-read the ayah slowly once.",
    "Action: Save one practical lesson from it.",
    "Sources: This needs a careful answer with stronger verified support for the exact details.",
  ].join("\n\n");

  const normalized = normaliseQuranLearningResponse(genericStructuredResponse, {
    surahNumber: 1,
    ayahNumber: 3,
    translation: "The Entirely Merciful, the Especially Merciful.",
    verseInsight:
      "This selected ayah names Allah's mercy and keeps the explanation anchored to the Quran reader context.",
    words: [
      {
        arabic: "الرَّحْمَٰنِ",
        translation: "The Entirely Merciful",
      },
      {
        arabic: "الرَّحِيمِ",
        translation: "The Especially Merciful",
      },
    ],
  });

  const findings: string[] = [];

  if (/NurAI needs more verified source support/i.test(normalized)) {
    findings.push("Generic source-review copy leaked into the Quran answer.");
  }

  if (/could not attach a verified source card/i.test(normalized)) {
    findings.push("Verified-source-card warning leaked into the Quran answer.");
  }

  for (const label of [
    "Meaning:",
    "Context:",
    "Key Words:",
    "Lesson:",
    "Avoid:",
    "Action:",
    "Sources:",
  ]) {
    if (!normalized.includes(label)) {
      findings.push(`Missing structured Quran label ${label}`);
    }
  }

  if (!normalized.includes("The Entirely Merciful")) {
    findings.push(
      "Selected ayah translation was not used as the fallback meaning.",
    );
  }

  if (!normalized.includes("Quran 1:3")) {
    findings.push("Selected Quran reference was not preserved.");
  }

  if (findings.length > 0) {
    console.error("Quran AI normalization check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Quran AI normalization check passed: generic source-review copy is replaced with selected-ayah learning sections.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
