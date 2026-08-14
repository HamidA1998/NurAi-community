import { EmotionalState, NurAIUserProfileV3 } from "./nuraiProfileV3";
import { NurAIPatternDetectorV3 } from "./nuraiPatternsV3";

export const EMOTION_TONE: Record<
  EmotionalState,
  { warmth: number; urgency: number; depth: number; encouragement: number }
> = {
  neutral: { warmth: 0.5, urgency: 0.3, depth: 0.5, encouragement: 0.5 },
  contemplative: { warmth: 0.7, urgency: 0.1, depth: 0.9, encouragement: 0.3 },
  struggling: { warmth: 0.9, urgency: 0.2, depth: 0.4, encouragement: 0.9 },
  celebrating: { warmth: 0.8, urgency: 0.1, depth: 0.3, encouragement: 0.8 },
  anxious: { warmth: 0.9, urgency: 0.1, depth: 0.2, encouragement: 0.7 },
  grieving: { warmth: 1.0, urgency: 0.0, depth: 0.3, encouragement: 0.8 },
  motivated: { warmth: 0.6, urgency: 0.5, depth: 0.6, encouragement: 0.7 },
  coasting: { warmth: 0.5, urgency: 0.4, depth: 0.5, encouragement: 0.6 },
  returning: { warmth: 0.9, urgency: 0.1, depth: 0.3, encouragement: 0.9 },
  exploring: { warmth: 0.5, urgency: 0.3, depth: 0.4, encouragement: 0.5 },
  deepening: { warmth: 0.6, urgency: 0.2, depth: 0.9, encouragement: 0.4 },
  ramadan_mode: { warmth: 0.7, urgency: 0.6, depth: 0.7, encouragement: 0.7 },
};

export function getEmotionalGreeting(
  state: EmotionalState,
  name?: string,
): string {
  const n = name ? `, ${name}` : "";
  const g: Record<EmotionalState, string[]> = {
    neutral: [`Assalamu alaikum${n}`, `Peace be upon you${n}`],
    contemplative: [
      `A peaceful night${n}`,
      `SubhanAllah \u2014 the night is quiet and full of barakah`,
    ],
    struggling: [
      `One gentle step at a time${n}.`,
      `Welcome${n}. Keep the next step small.`,
    ],
    celebrating: [`MashaAllah${n}! Look at you go!`, `SubhanAllah${n}!`],
    anxious: [
      `Take a quiet breath${n}.`,
      `Slow down${n}. One calm step is enough.`,
    ],
    grieving: [
      `Welcome back${n}. The door to Allah never closes.`,
      `Every return is a victory${n}.`,
    ],
    motivated: [
      `Bismillah${n}! Let's make today count!`,
      `On fire${n}! Channel that energy.`,
    ],
    coasting: [
      `Assalamu alaikum${n}. Even showing up is a deed.`,
      `Small and consistent beats big and rare${n}.`,
    ],
    returning: [
      `Welcome back${n}. Begin with one small step.`,
      `A fresh start${n}. Keep it simple.`,
    ],
    exploring: [
      `Exploring today${n}? So much to discover.`,
      `Choose one topic to explore${n}.`,
    ],
    deepening: [
      `Going deep today${n}? Beautiful.`,
      `Quality over quantity${n}. You get it.`,
    ],
    ramadan_mode: [
      `Ramadan Mubarak${n}!`,
      `May this Ramadan transform you${n}.`,
    ],
  };
  const opts = g[state] || g.neutral;
  return opts[Math.floor(Math.random() * opts.length)];
}

export function updateEmotionalState(
  profile: NurAIUserProfileV3,
): EmotionalState {
  return NurAIPatternDetectorV3.inferEmotionalState(profile);
}
