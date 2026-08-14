import type { QuranLearnedWord } from "@/services/quranLearningService";

export type ArabicQuranBridgeItem = {
  id: "source" | "review" | "practice" | "boundary";
  label: string;
  detail: string;
  statusLabel: string;
  icon: "book-open" | "repeat" | "message-square" | "shield";
  tone: "quran" | "review" | "practice" | "boundary";
};

export type ArabicQuranBridgeWord = {
  arabic: string;
  transliteration: string;
  meaning: string;
  note: string;
  source: string;
};

export type ArabicQuranBridgePlan = {
  title: string;
  statusLabel: string;
  word: ArabicQuranBridgeWord;
  savedQuranWordCount: number;
  reviewCount: number;
  recallAttemptCount: number;
  prompt: string;
  boundaryLabel: string;
  items: ArabicQuranBridgeItem[];
};

export function toArabicQuranBridgeWord(
  savedWord: QuranLearnedWord | null | undefined,
  fallbackWord: ArabicQuranBridgeWord,
): ArabicQuranBridgeWord {
  if (!savedWord) return fallbackWord;

  const source = savedWord.wordLocation?.trim()
    ? savedWord.wordLocation.trim()
    : `Quran ${savedWord.surahNumber}:${savedWord.ayahNumber}`;

  return {
    arabic: savedWord.arabicWord || fallbackWord.arabic,
    transliteration:
      savedWord.transliterationWord ||
      savedWord.normalizedArabicWord ||
      fallbackWord.transliteration,
    meaning: savedWord.translationWord || fallbackWord.meaning,
    note: "Saved from Quran Reader. Arabic Learning should treat this as vocabulary recall in context, not tafsir or a ruling.",
    source,
  };
}

export function buildArabicQuranBridgePlan(input: {
  savedWords: QuranLearnedWord[];
  fallbackWord: ArabicQuranBridgeWord;
  recallAttemptCount: number;
}): ArabicQuranBridgePlan {
  const savedWords = input.savedWords.filter((word) => word.arabicWord?.trim());
  const selectedSavedWord =
    savedWords.length > 0
      ? savedWords[new Date().getDate() % savedWords.length]
      : null;
  const word = toArabicQuranBridgeWord(selectedSavedWord, input.fallbackWord);
  const reviewCount = selectedSavedWord?.reviewCount ?? 0;
  const hasReaderWord = Boolean(selectedSavedWord);
  const recallAttemptCount = Math.max(0, input.recallAttemptCount);

  return {
    title: "Quran vocabulary bridge",
    statusLabel: hasReaderWord
      ? `${savedWords.length} saved Quran word${savedWords.length === 1 ? "" : "s"} linked`
      : "Using today’s starter Quran word",
    word,
    savedQuranWordCount: savedWords.length,
    reviewCount,
    recallAttemptCount,
    prompt: `Bridge my Quran Reader vocabulary into Arabic practice. Test my recall for "${word.arabic}" (${word.transliteration}) from ${word.source}. Ask me to explain the meaning first, then show meaning, transliteration, one language note, and one short sentence drill. Do not give tafsir, a fatwa, tajwid certification, or a claim about my fluency.`,
    boundaryLabel:
      "Saved Quran words become Arabic vocabulary practice only. This bridge does not certify tajwid, fluency, Quran interpretation, or teacher review.",
    items: [
      {
        id: "source",
        label: "Reader source",
        detail: hasReaderWord
          ? `${word.source} saved from Quran Reader vocabulary.`
          : `${word.source} from the starter Quranic word list.`,
        statusLabel: hasReaderWord ? "Reader-linked" : "Starter",
        icon: "book-open",
        tone: "quran",
      },
      {
        id: "review",
        label: "Review memory",
        detail: hasReaderWord
          ? `${reviewCount} Quran Reader review${reviewCount === 1 ? "" : "s"} recorded for this word.`
          : "Save words in Quran Reader to make this bridge personal.",
        statusLabel: hasReaderWord ? "Private progress" : "Add in Reader",
        icon: "repeat",
        tone: "review",
      },
      {
        id: "practice",
        label: "Arabic recall",
        detail: `${recallAttemptCount} Arabic recall attempt${recallAttemptCount === 1 ? "" : "s"} saved for ${word.transliteration}.`,
        statusLabel: recallAttemptCount > 0 ? "Recall active" : "Try recall",
        icon: "message-square",
        tone: "practice",
      },
      {
        id: "boundary",
        label: "Claim boundary",
        detail:
          "Use this for language recall and sentence practice, not tafsir, rulings, tajwid certification, or public fluency claims.",
        statusLabel: "Practice only",
        icon: "shield",
        tone: "boundary",
      },
    ],
  };
}
