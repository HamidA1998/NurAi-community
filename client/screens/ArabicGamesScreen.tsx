import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, CategoryColors } from "@/constants/theme";
import { useKidsMode } from "@/context/KidsModeContext";
import { KidsCelebrationModal } from "@/components/kids/KidsCelebrationModal";
import {
  ArabicLearningProgress,
  createDefaultArabicLearningProgress,
  loadArabicLearningProgress,
  registerArabicGameCompletion,
  saveArabicLearningProgress,
} from "@/services/arabicLearningProgressService";
import { AppIcon } from "@/components/icons";

const ALL_LETTERS = [
  { id: "alif", arabic: "\u0627", name: "Alif", matchLabel: "Alif" },
  { id: "ba", arabic: "\u0628", name: "Ba", matchLabel: "Ba" },
  { id: "ta", arabic: "\u062A", name: "Ta", matchLabel: "Ta" },
  { id: "tha", arabic: "\u062B", name: "Tha", matchLabel: "Tha" },
  { id: "jim", arabic: "\u062C", name: "Jim", matchLabel: "Jim" },
  {
    id: "ha-deep",
    arabic: "\u062D",
    name: "Ha",
    matchLabel: "Ha (deep)",
  },
  { id: "kha", arabic: "\u062E", name: "Kha", matchLabel: "Kha" },
  { id: "dal", arabic: "\u062F", name: "Dal", matchLabel: "Dal" },
  { id: "dhal", arabic: "\u0630", name: "Dhal", matchLabel: "Dhal" },
  { id: "ra", arabic: "\u0631", name: "Ra", matchLabel: "Ra" },
  { id: "zay", arabic: "\u0632", name: "Zay", matchLabel: "Zay" },
  { id: "sin", arabic: "\u0633", name: "Sin", matchLabel: "Sin" },
  { id: "shin", arabic: "\u0634", name: "Shin", matchLabel: "Shin" },
  { id: "sad", arabic: "\u0635", name: "Sad", matchLabel: "Sad" },
  { id: "dad", arabic: "\u0636", name: "Dad", matchLabel: "Dad" },
  {
    id: "ta-emphatic",
    arabic: "\u0637",
    name: "Ta",
    matchLabel: "Ta (emphatic)",
  },
  { id: "dha", arabic: "\u0638", name: "Dha", matchLabel: "Dha" },
  { id: "ayn", arabic: "\u0639", name: "Ayn", matchLabel: "Ayn" },
  { id: "ghayn", arabic: "\u063A", name: "Ghayn", matchLabel: "Ghayn" },
  { id: "fa", arabic: "\u0641", name: "Fa", matchLabel: "Fa" },
  { id: "qaf", arabic: "\u0642", name: "Qaf", matchLabel: "Qaf" },
  { id: "kaf", arabic: "\u0643", name: "Kaf", matchLabel: "Kaf" },
  { id: "lam", arabic: "\u0644", name: "Lam", matchLabel: "Lam" },
  { id: "mim", arabic: "\u0645", name: "Mim", matchLabel: "Mim" },
  { id: "nun", arabic: "\u0646", name: "Nun", matchLabel: "Nun" },
  {
    id: "ha-soft",
    arabic: "\u0647",
    name: "Ha",
    matchLabel: "Ha (soft)",
  },
  { id: "waw", arabic: "\u0648", name: "Waw", matchLabel: "Waw" },
  { id: "ya", arabic: "\u064A", name: "Ya", matchLabel: "Ya" },
];

type ArabicGameLetter = (typeof ALL_LETTERS)[number];

const WORD_BUILDER_WORDS = [
  {
    word: "\u0633\u0644\u0627\u0645",
    transliteration: "Salaam",
    letters: ["\u0633", "\u0644", "\u0627", "\u0645"],
  },
  {
    word: "\u0643\u062A\u0627\u0628",
    transliteration: "Kitab",
    letters: ["\u0643", "\u062A", "\u0627", "\u0628"],
  },
  {
    word: "\u0642\u0644\u0645",
    transliteration: "Qalam",
    letters: ["\u0642", "\u0644", "\u0645"],
  },
  {
    word: "\u0628\u064A\u062A",
    transliteration: "Bayt",
    letters: ["\u0628", "\u064A", "\u062A"],
  },
  {
    word: "\u0645\u0627\u0621",
    transliteration: "Maa",
    letters: ["\u0645", "\u0627", "\u0621"],
  },
];

const QUIZ_QUESTIONS = [
  {
    question: "What is the first letter of the Arabic alphabet?",
    options: ["Alif", "Ba", "Ta", "Jim"],
    correct: 0,
  },
  {
    question: "What does 'Bismillah' mean?",
    options: [
      "Peace be upon you",
      "In the name of Allah",
      "Allah is great",
      "Praise be to Allah",
    ],
    correct: 1,
  },
  {
    question: "How many letters are in the Arabic alphabet?",
    options: ["26", "28", "30", "24"],
    correct: 1,
  },
  {
    question: "Which letter makes the 'sh' sound?",
    options: ["Sin", "Sad", "Shin", "Tha"],
    correct: 2,
  },
  {
    question: "What is 'Salaam' in English?",
    options: ["Prayer", "Peace", "Love", "Faith"],
    correct: 1,
  },
];

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom<T>(array: T[], count: number): T[] {
  const shuffled = shuffle(array);
  return shuffled.slice(0, count);
}

type MatchGameState = "idle" | "playing" | "complete";
type WordBuilderState = "idle" | "playing" | "complete";
type QuizState = "idle" | "playing" | "complete";

const GAME_REWARDS: Record<string, number> = {
  "letter-match": 10,
  "word-builder": 16,
  quiz: 12,
};

export default function ArabicGamesScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { recordActivity, recordGamePlayed } = useKidsMode();

  const [celebration, setCelebration] = useState<{
    title: string;
    subtitle: string;
    points: number;
  } | null>(null);

  const [matchState, setMatchState] = useState<MatchGameState>("idle");
  const [matchLetters, setMatchLetters] = useState<ArabicGameLetter[]>([]);
  const [matchNames, setMatchNames] = useState<ArabicGameLetter[]>([]);
  const [selectedArabic, setSelectedArabic] = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set());
  const [matchScore, setMatchScore] = useState(0);

  const [wordState, setWordState] = useState<WordBuilderState>("idle");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
  const [selectedWordLetters, setSelectedWordLetters] = useState<number[]>([]);
  const [wordScore, setWordScore] = useState(0);

  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [learningProgress, setLearningProgress] =
    useState<ArabicLearningProgress>(createDefaultArabicLearningProgress);
  const [progressNotice, setProgressNotice] = useState<string | null>(null);
  const learningProgressRef = useRef<ArabicLearningProgress>(
    createDefaultArabicLearningProgress(),
  );
  const progressSaveQueueRef = useRef(Promise.resolve());
  const mountedRef = useRef(true);

  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;
    loadArabicLearningProgress()
      .then((progress) => {
        if (mounted) {
          learningProgressRef.current = progress;
          setLearningProgress(progress);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
      mountedRef.current = false;
    };
  }, []);

  const saveGameCompletion = useCallback(
    async (gameId: keyof typeof GAME_REWARDS, label: string) => {
      const reward = GAME_REWARDS[gameId];
      const next = registerArabicGameCompletion(
        learningProgressRef.current,
        gameId,
        reward,
      );
      learningProgressRef.current = next;
      setLearningProgress(next);
      setProgressNotice(`Saving ${label} progress...`);

      recordActivity(2, reward);
      recordGamePlayed();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCelebration({
        title: "Nicely done!",
        subtitle: `${label} complete.`,
        points: reward,
      });

      progressSaveQueueRef.current = progressSaveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          await saveArabicLearningProgress(next);
          if (mountedRef.current) {
            setProgressNotice(
              `${label}: Saved to Arabic Learning +${reward} XP`,
            );
          }
        })
        .catch(() => {
          if (mountedRef.current) {
            setProgressNotice("Progress could not be saved. Please try again.");
          }
        });
    },
    [recordActivity, recordGamePlayed],
  );

  const startMatchGame = useCallback(() => {
    setProgressNotice(null);
    const letters = pickRandom(ALL_LETTERS, 4);
    setMatchLetters(letters);
    setMatchNames(shuffle(letters));
    setSelectedArabic(null);
    setMatchedPairs(new Set());
    setMatchScore(0);
    setMatchState("playing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleArabicTap = (index: number) => {
    if (matchedPairs.has(index)) return;
    setSelectedArabic(index);
    Haptics.selectionAsync();
  };

  const handleNameTap = (nameIndex: number) => {
    if (selectedArabic === null) return;
    const name = matchNames[nameIndex];
    const letter = matchLetters[selectedArabic];
    if (letter.id === name.id) {
      setProgressNotice("Matched. Choose the next Arabic letter.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newMatched = new Set(matchedPairs);
      newMatched.add(selectedArabic);
      setMatchedPairs(newMatched);
      setMatchScore((prev) => prev + 1);
      setSelectedArabic(null);
      if (newMatched.size === 4) {
        setMatchState("complete");
        saveGameCompletion("letter-match", "Letter Match");
      }
    } else {
      setSelectedArabic(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setProgressNotice(
        "Not a match yet. Try the highlighted Arabic letter again.",
      );
    }
  };

  const startWordBuilder = useCallback(() => {
    setProgressNotice(null);
    setCurrentWordIndex(0);
    setWordScore(0);
    const word = WORD_BUILDER_WORDS[0];
    setShuffledLetters(shuffle(word.letters));
    setSelectedWordLetters([]);
    setWordState("playing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleWordLetterTap = (index: number) => {
    if (selectedWordLetters.includes(index)) return;
    const currentWord = WORD_BUILDER_WORDS[currentWordIndex];
    const expectedIndex = selectedWordLetters.length;
    const tappedLetter = shuffledLetters[index];

    if (tappedLetter === currentWord.letters[expectedIndex]) {
      setProgressNotice("Good sound. Keep building the word.");
      Haptics.selectionAsync();
      const newSelected = [...selectedWordLetters, index];
      setSelectedWordLetters(newSelected);

      if (newSelected.length === currentWord.letters.length) {
        setWordScore((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const nextIndex = currentWordIndex + 1;
        if (nextIndex < WORD_BUILDER_WORDS.length) {
          setTimeout(() => {
            setCurrentWordIndex(nextIndex);
            const nextWord = WORD_BUILDER_WORDS[nextIndex];
            setShuffledLetters(shuffle(nextWord.letters));
            setSelectedWordLetters([]);
          }, 600);
        } else {
          setTimeout(() => {
            setWordState("complete");
            saveGameCompletion("word-builder", "Word Builder");
          }, 600);
        }
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setProgressNotice("That letter comes later. Try the next sound.");
    }
  };

  const startQuiz = useCallback(() => {
    setProgressNotice(null);
    setCurrentQuestion(0);
    setQuizScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuizState("playing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleQuizAnswer = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    const isCorrect = answerIndex === QUIZ_QUESTIONS[currentQuestion].correct;
    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => {
      const nextQ = currentQuestion + 1;
      if (nextQ < QUIZ_QUESTIONS.length) {
        setCurrentQuestion(nextQ);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setQuizState("complete");
        saveGameCompletion("quiz", "Quiz");
      }
    }, 1200);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h4">Arabic Games</ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(300)}>
          <LinearGradient
            colors={[theme.gradientStart, theme.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <AppIcon name="zap" size={32} color="rgba(255,255,255,0.9)" />
            <ThemedText type="h2" style={styles.heroTitle}>
              Arabic Games
            </ThemedText>
            <ThemedText type="body" style={styles.heroSubtitle}>
              Build your Arabic streak with fast games that save into your
              learning journey.
            </ThemedText>
            <View style={styles.heroProgressPill}>
              <AppIcon name="award" size={13} color="rgba(255,255,255,0.9)" />
              <ThemedText type="caption" style={styles.heroProgressText}>
                {learningProgress.xp} Arabic XP
              </ThemedText>
              <View style={styles.heroPillDivider} />
              <AppIcon name="zap" size={13} color="rgba(255,255,255,0.9)" />
              <ThemedText type="caption" style={styles.heroProgressText}>
                {learningProgress.streakDays} day streak
              </ThemedText>
            </View>
            {progressNotice ? (
              <ThemedText type="caption" style={styles.progressNotice}>
                {progressNotice}
              </ThemedText>
            ) : null}
          </LinearGradient>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(300)}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: `${theme.primary}20` },
              ]}
            >
              <AppIcon name="layers" size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Letter Match</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Match Arabic letters with their sounds
              </ThemedText>
            </View>
            {matchState !== "idle" ? (
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: `${theme.primary}15` },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.primary, fontWeight: "600" }}
                >
                  {matchScore}/4
                </ThemedText>
              </View>
            ) : null}
          </View>

          {matchState === "idle" ? (
            <Pressable
              onPress={startMatchGame}
              style={({ pressed }) => [
                styles.startButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              testID="button-start-match"
            >
              <AppIcon name="play" size={18} color={theme.buttonText} />
              <ThemedText
                type="body"
                style={{ color: theme.buttonText, fontWeight: "600" }}
              >
                Start Game
              </ThemedText>
            </Pressable>
          ) : matchState === "complete" ? (
            <View style={styles.completeSection}>
              <View
                style={[
                  styles.completeIcon,
                  { backgroundColor: `${theme.primary}20` },
                ]}
              >
                <AppIcon name="award" size={28} color={theme.primary} />
              </View>
              <ThemedText type="h4" style={{ color: theme.primary }}>
                All Matched!
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, textAlign: "center" }}
              >
                Saved to Arabic Learning
              </ThemedText>
              <Pressable
                onPress={startMatchGame}
                style={({ pressed }) => [
                  styles.startButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                testID="button-reset-match"
              >
                <AppIcon name="refresh-cw" size={18} color="#FFFFFF" />
                <ThemedText
                  type="body"
                  style={{ color: theme.buttonText, fontWeight: "600" }}
                >
                  Play Again
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.matchGameArea}>
              <View style={styles.matchRow}>
                {matchLetters.map((letter, index) => {
                  const isMatched = matchedPairs.has(index);
                  const isSelected = selectedArabic === index;
                  return (
                    <Pressable
                      key={`arabic-${index}`}
                      onPress={() => handleArabicTap(index)}
                      disabled={isMatched}
                      accessibilityRole="button"
                      accessibilityLabel={`Select Arabic letter ${letter.name}`}
                      accessibilityState={{
                        selected: isSelected,
                        disabled: isMatched,
                      }}
                      style={[
                        styles.matchTile,
                        {
                          backgroundColor: isMatched
                            ? `${theme.primary}20`
                            : isSelected
                              ? `${theme.primary}15`
                              : theme.backgroundSecondary,
                          borderColor: isMatched
                            ? theme.primary
                            : isSelected
                              ? theme.primary
                              : theme.borderSubtle,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.matchArabic,
                          { color: isMatched ? theme.primary : theme.text },
                        ]}
                      >
                        {letter.arabic}
                      </ThemedText>
                      {isMatched ? (
                        <AppIcon name="check" size={14} color={theme.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.matchRow}>
                {matchNames.map((name, index) => {
                  const isUsed = Array.from(matchedPairs).some(
                    (mi) => matchLetters[mi].id === name.id,
                  );
                  return (
                    <Pressable
                      key={`name-${name.id}`}
                      onPress={() => handleNameTap(index)}
                      disabled={isUsed}
                      accessibilityRole="button"
                      accessibilityLabel={`Match sound ${name.matchLabel}`}
                      accessibilityState={{ disabled: isUsed }}
                      style={[
                        styles.matchTile,
                        {
                          backgroundColor: isUsed
                            ? `${theme.primary}20`
                            : theme.backgroundSecondary,
                          borderColor: isUsed
                            ? theme.primary
                            : theme.borderSubtle,
                          opacity: isUsed ? 0.6 : 1,
                        },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        style={{
                          fontWeight: "600",
                          color: isUsed ? theme.primary : theme.text,
                        }}
                      >
                        {name.matchLabel}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(160).duration(300)}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardIcon,
                {
                  backgroundColor: isDark
                    ? CategoryColors.amber.dark.bg
                    : CategoryColors.amber.bg,
                },
              ]}
            >
              <AppIcon
                name="edit-3"
                size={18}
                color={
                  isDark
                    ? CategoryColors.amber.dark.text
                    : CategoryColors.amber.text
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Word Builder</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Arrange letters to form Arabic words
              </ThemedText>
            </View>
            {wordState !== "idle" ? (
              <View
                style={[
                  styles.scoreBadge,
                  {
                    backgroundColor: isDark
                      ? CategoryColors.amber.dark.bg
                      : CategoryColors.amber.bg,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: isDark
                      ? CategoryColors.amber.dark.text
                      : CategoryColors.amber.text,
                    fontWeight: "600",
                  }}
                >
                  {wordScore}/{WORD_BUILDER_WORDS.length}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {wordState === "idle" ? (
            <Pressable
              onPress={startWordBuilder}
              style={({ pressed }) => [
                styles.startButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              testID="button-start-word"
            >
              <AppIcon name="play" size={18} color={theme.buttonText} />
              <ThemedText
                type="body"
                style={{ color: theme.buttonText, fontWeight: "600" }}
              >
                Start Game
              </ThemedText>
            </Pressable>
          ) : wordState === "complete" ? (
            <View style={styles.completeSection}>
              <View
                style={[
                  styles.completeIcon,
                  { backgroundColor: `${theme.primary}20` },
                ]}
              >
                <AppIcon name="award" size={28} color={theme.primary} />
              </View>
              <ThemedText type="h4" style={{ color: theme.primary }}>
                {wordScore}/{WORD_BUILDER_WORDS.length} Words Built!
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, textAlign: "center" }}
              >
                Saved to Arabic Learning
              </ThemedText>
              <Pressable
                onPress={startWordBuilder}
                style={({ pressed }) => [
                  styles.startButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                testID="button-reset-word"
              >
                <AppIcon name="refresh-cw" size={18} color="#FFFFFF" />
                <ThemedText
                  type="body"
                  style={{ color: theme.buttonText, fontWeight: "600" }}
                >
                  Play Again
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.wordGameArea}>
              <View style={styles.wordTargetRow}>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Build: {WORD_BUILDER_WORDS[currentWordIndex].transliteration}
                </ThemedText>
                <ThemedText
                  style={[styles.wordTarget, { color: theme.textMuted }]}
                >
                  {WORD_BUILDER_WORDS[currentWordIndex].word}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.wordBuiltRow,
                  { borderColor: theme.borderSubtle },
                ]}
              >
                {WORD_BUILDER_WORDS[currentWordIndex].letters.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.wordSlot,
                      {
                        backgroundColor:
                          idx < selectedWordLetters.length
                            ? `${theme.primary}15`
                            : theme.backgroundSecondary,
                        borderColor:
                          idx < selectedWordLetters.length
                            ? theme.primary
                            : theme.borderSubtle,
                      },
                    ]}
                  >
                    {idx < selectedWordLetters.length ? (
                      <ThemedText
                        style={[
                          styles.wordSlotLetter,
                          { color: theme.primary },
                        ]}
                      >
                        {shuffledLetters[selectedWordLetters[idx]]}
                      </ThemedText>
                    ) : null}
                  </View>
                ))}
              </View>
              <View style={styles.wordLetterOptions}>
                {shuffledLetters.map((letter, index) => {
                  const isUsed = selectedWordLetters.includes(index);
                  return (
                    <Pressable
                      key={index}
                      onPress={() => handleWordLetterTap(index)}
                      disabled={isUsed}
                      accessibilityRole="button"
                      accessibilityLabel={`Choose Arabic letter ${letter}`}
                      accessibilityState={{ disabled: isUsed }}
                      style={[
                        styles.wordLetterBtn,
                        {
                          backgroundColor: isUsed
                            ? `${theme.primary}10`
                            : theme.backgroundSecondary,
                          borderColor: isUsed
                            ? theme.primary
                            : theme.borderSubtle,
                          opacity: isUsed ? 0.4 : 1,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.wordLetterText,
                          { color: isUsed ? theme.primary : theme.text },
                        ]}
                      >
                        {letter}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(240).duration(300)}
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardIcon,
                {
                  backgroundColor: isDark
                    ? CategoryColors.purple.dark.bg
                    : CategoryColors.purple.bg,
                },
              ]}
            >
              <AppIcon
                name="help-circle"
                size={18}
                color={
                  isDark
                    ? CategoryColors.purple.dark.text
                    : CategoryColors.purple.text
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="h4">Quiz</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textMuted }}>
                Test your Arabic knowledge
              </ThemedText>
            </View>
            {quizState !== "idle" ? (
              <View
                style={[
                  styles.scoreBadge,
                  {
                    backgroundColor: isDark
                      ? CategoryColors.purple.dark.bg
                      : CategoryColors.purple.bg,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: isDark
                      ? CategoryColors.purple.dark.text
                      : CategoryColors.purple.text,
                    fontWeight: "600",
                  }}
                >
                  {quizScore}/{QUIZ_QUESTIONS.length}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {quizState === "idle" ? (
            <Pressable
              onPress={startQuiz}
              style={({ pressed }) => [
                styles.startButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              testID="button-start-quiz"
            >
              <AppIcon name="play" size={18} color="#FFFFFF" />
              <ThemedText
                type="body"
                style={{ color: theme.buttonText, fontWeight: "600" }}
              >
                Start Quiz
              </ThemedText>
            </Pressable>
          ) : quizState === "complete" ? (
            <View style={styles.completeSection}>
              <View
                style={[
                  styles.completeIcon,
                  { backgroundColor: `${theme.primary}20` },
                ]}
              >
                <AppIcon name="award" size={28} color={theme.primary} />
              </View>
              <ThemedText type="h4" style={{ color: theme.primary }}>
                Score: {quizScore}/{QUIZ_QUESTIONS.length}
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, textAlign: "center" }}
              >
                {quizScore === QUIZ_QUESTIONS.length
                  ? "Perfect score!"
                  : quizScore >= 3
                    ? "Great job!"
                    : "Keep practicing!"}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, textAlign: "center" }}
              >
                Saved to Arabic Learning
              </ThemedText>
              <Pressable
                onPress={startQuiz}
                style={({ pressed }) => [
                  styles.startButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                testID="button-reset-quiz"
              >
                <AppIcon name="refresh-cw" size={18} color="#FFFFFF" />
                <ThemedText
                  type="body"
                  style={{ color: theme.buttonText, fontWeight: "600" }}
                >
                  Try Again
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.quizArea}>
              <View style={styles.quizProgress}>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
                </ThemedText>
                <View
                  style={[
                    styles.quizProgressBar,
                    { backgroundColor: `${theme.primary}20` },
                  ]}
                >
                  <View
                    style={[
                      styles.quizProgressFill,
                      {
                        backgroundColor: theme.primary,
                        width: `${((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {QUIZ_QUESTIONS[currentQuestion].question}
              </ThemedText>
              <View style={styles.quizOptions}>
                {QUIZ_QUESTIONS[currentQuestion].options.map(
                  (option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect =
                      index === QUIZ_QUESTIONS[currentQuestion].correct;
                    let bgColor = theme.backgroundSecondary;
                    let borderColor = theme.borderSubtle;
                    let textColor = theme.text;

                    if (showResult) {
                      if (isCorrect) {
                        bgColor = `${theme.primary}20`;
                        borderColor = theme.primary;
                        textColor = theme.primary;
                      } else if (isSelected && !isCorrect) {
                        bgColor = `${theme.error}15`;
                        borderColor = theme.error;
                        textColor = theme.error;
                      }
                    } else if (isSelected) {
                      bgColor = `${theme.primary}15`;
                      borderColor = theme.primary;
                    }

                    return (
                      <Pressable
                        key={index}
                        onPress={() => handleQuizAnswer(index)}
                        disabled={showResult}
                        accessibilityRole="button"
                        accessibilityLabel={`Answer ${option}`}
                        accessibilityState={{
                          disabled: showResult,
                          selected: isSelected,
                        }}
                        style={[
                          styles.quizOption,
                          { backgroundColor: bgColor, borderColor },
                        ]}
                      >
                        <View style={[styles.quizOptionDot, { borderColor }]}>
                          {showResult && isCorrect ? (
                            <AppIcon
                              name="check"
                              size={12}
                              color={theme.primary}
                            />
                          ) : showResult && isSelected && !isCorrect ? (
                            <AppIcon name="x" size={12} color={theme.error} />
                          ) : null}
                        </View>
                        <ThemedText
                          type="small"
                          style={{ color: textColor, flex: 1 }}
                        >
                          {option}
                        </ThemedText>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>
      <KidsCelebrationModal
        visible={!!celebration}
        title={celebration?.title ?? ""}
        subtitle={celebration?.subtitle}
        points={celebration?.points}
        onClose={() => setCelebration(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingHorizontal: Spacing.lg },
  heroCard: {
    borderRadius: 24,
    padding: Spacing["2xl"],
    marginBottom: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  heroTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  heroProgressPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroProgressText: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "800",
  },
  heroPillDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginHorizontal: 2,
  },
  progressNotice: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "800",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: 16,
  },
  completeSection: {
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  completeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  matchGameArea: {
    gap: Spacing.lg,
  },
  matchRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  matchTile: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 72,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  matchArabic: {
    fontSize: 24,
    lineHeight: 32,
  },
  wordGameArea: {
    gap: Spacing.lg,
  },
  wordTargetRow: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  wordTarget: {
    fontSize: 28,
    lineHeight: 36,
  },
  wordBuiltRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  wordSlot: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  wordSlotLetter: {
    fontSize: 24,
    lineHeight: 32,
  },
  wordLetterOptions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  wordLetterBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  wordLetterText: {
    fontSize: 24,
    lineHeight: 32,
  },
  quizArea: {
    gap: Spacing.lg,
  },
  quizProgress: {
    gap: Spacing.xs,
  },
  quizProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  quizProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  quizOptions: {
    gap: Spacing.sm,
  },
  quizOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  quizOptionDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
