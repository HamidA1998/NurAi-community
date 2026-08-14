// Curated workout content for the NurAI Health section. This is editorial
// content (like dua or adhkar collections), not user data — user results are
// always computed from real sessions.

export type WorkoutCategoryId =
  | "for_you"
  | "strength"
  | "running"
  | "mobility"
  | "cardio";

export type WorkoutExercise = {
  id: string;
  name: string;
  sets: number;
  repsLabel: string;
  restSeconds: number;
  muscles: string[];
};

export type WorkoutDefinition = {
  id: string;
  title: string;
  subtitle: string;
  category: Exclude<WorkoutCategoryId, "for_you">;
  minutes: number;
  intensity: "Light" | "Medium" | "High";
  equipment: string;
  focus: string;
  icon: "activity" | "zap" | "wind" | "trending-up" | "heart";
  muscleGroups: { name: string; share: number }[];
  exercises: WorkoutExercise[];
};

export const WORKOUT_CATEGORIES: { id: WorkoutCategoryId; label: string }[] = [
  { id: "for_you", label: "For You" },
  { id: "strength", label: "Strength" },
  { id: "running", label: "Running" },
  { id: "mobility", label: "Mobility" },
  { id: "cardio", label: "Cardio" },
];

const ex = (
  id: string,
  name: string,
  sets: number,
  repsLabel: string,
  restSeconds: number,
  muscles: string[],
): WorkoutExercise => ({ id, name, sets, repsLabel, restSeconds, muscles });

export const WORKOUT_LIBRARY: WorkoutDefinition[] = [
  {
    id: "upper-body-strength",
    title: "Upper Body Strength",
    subtitle: "Build lean muscle and improve upper-body performance.",
    category: "strength",
    minutes: 45,
    intensity: "Medium",
    equipment: "Dumbbells",
    focus: "Chest · Back · Shoulders",
    icon: "activity",
    muscleGroups: [
      { name: "Chest", share: 0.35 },
      { name: "Back", share: 0.35 },
      { name: "Shoulders", share: 0.2 },
      { name: "Arms", share: 0.1 },
    ],
    exercises: [
      ex("bench-press", "Bench Press", 4, "8–10 reps", 90, ["Chest"]),
      ex("seated-row", "Seated Row", 4, "10–12 reps", 90, ["Back"]),
      ex("shoulder-press", "Shoulder Press", 3, "8–10 reps", 90, ["Shoulders"]),
      ex("lat-pulldown", "Lat Pulldown", 3, "10–12 reps", 90, ["Back"]),
    ],
  },
  {
    id: "lower-body-power",
    title: "Lower Body Power",
    subtitle: "Strong legs carry every step of the day.",
    category: "strength",
    minutes: 40,
    intensity: "High",
    equipment: "Dumbbells",
    focus: "Quads · Glutes · Hamstrings",
    icon: "zap",
    muscleGroups: [
      { name: "Quads", share: 0.35 },
      { name: "Glutes", share: 0.3 },
      { name: "Hamstrings", share: 0.25 },
      { name: "Calves", share: 0.1 },
    ],
    exercises: [
      ex("goblet-squat", "Goblet Squat", 4, "8–10 reps", 90, ["Quads"]),
      ex("romanian-deadlift", "Romanian Deadlift", 4, "8–10 reps", 90, [
        "Hamstrings",
      ]),
      ex("walking-lunge", "Walking Lunge", 3, "10 each side", 75, ["Glutes"]),
      ex("calf-raise", "Calf Raise", 3, "12–15 reps", 60, ["Calves"]),
    ],
  },
  {
    id: "full-body-foundation",
    title: "Full Body Foundation",
    subtitle: "One balanced session for the whole body.",
    category: "strength",
    minutes: 35,
    intensity: "Medium",
    equipment: "Bodyweight or dumbbells",
    focus: "Full body",
    icon: "trending-up",
    muscleGroups: [
      { name: "Legs", share: 0.35 },
      { name: "Chest", share: 0.25 },
      { name: "Back", share: 0.25 },
      { name: "Core", share: 0.15 },
    ],
    exercises: [
      ex("squat", "Squat", 3, "10–12 reps", 75, ["Legs"]),
      ex("pushup", "Push-Up", 3, "8–12 reps", 75, ["Chest"]),
      ex("row", "One-Arm Row", 3, "10 each side", 75, ["Back"]),
      ex("plank", "Plank", 3, "30–45 sec", 60, ["Core"]),
    ],
  },
  {
    id: "easy-run",
    title: "Easy Conversational Run",
    subtitle: "A relaxed pace you could hold while talking.",
    category: "running",
    minutes: 30,
    intensity: "Light",
    equipment: "None",
    focus: "Aerobic base",
    icon: "wind",
    muscleGroups: [
      { name: "Legs", share: 0.7 },
      { name: "Core", share: 0.3 },
    ],
    exercises: [
      ex("warm-walk", "Brisk Walk Warm-Up", 1, "5 min", 0, ["Legs"]),
      ex("easy-run", "Easy Run", 1, "20 min", 0, ["Legs"]),
      ex("cool-walk", "Cool-Down Walk", 1, "5 min", 0, ["Legs"]),
    ],
  },
  {
    id: "interval-run",
    title: "Interval Run",
    subtitle: "Short surges to lift your engine gently.",
    category: "running",
    minutes: 25,
    intensity: "High",
    equipment: "None",
    focus: "Speed · Heart",
    icon: "zap",
    muscleGroups: [
      { name: "Legs", share: 0.7 },
      { name: "Core", share: 0.3 },
    ],
    exercises: [
      ex("warmup-jog", "Warm-Up Jog", 1, "5 min", 0, ["Legs"]),
      ex("surges", "1-min Surge / 2-min Easy", 5, "1 min fast", 120, ["Legs"]),
      ex("cooldown-jog", "Cool-Down", 1, "5 min", 0, ["Legs"]),
    ],
  },
  {
    id: "morning-mobility",
    title: "Morning Mobility",
    subtitle: "Wake the joints gently before the day begins.",
    category: "mobility",
    minutes: 15,
    intensity: "Light",
    equipment: "Mat",
    focus: "Hips · Spine · Shoulders",
    icon: "wind",
    muscleGroups: [
      { name: "Hips", share: 0.4 },
      { name: "Spine", share: 0.35 },
      { name: "Shoulders", share: 0.25 },
    ],
    exercises: [
      ex("cat-cow", "Cat–Cow", 2, "8 slow reps", 30, ["Spine"]),
      ex("hip-opener", "90/90 Hip Opener", 2, "45 sec each side", 30, ["Hips"]),
      ex("shoulder-circles", "Shoulder Circles", 2, "10 each way", 30, [
        "Shoulders",
      ]),
      ex("deep-squat-hold", "Deep Squat Hold", 2, "30 sec", 30, ["Hips"]),
    ],
  },
  {
    id: "evening-unwind",
    title: "Evening Unwind",
    subtitle: "Slow stretches to prepare the body for rest.",
    category: "mobility",
    minutes: 12,
    intensity: "Light",
    equipment: "Mat",
    focus: "Recovery · Sleep",
    icon: "heart",
    muscleGroups: [
      { name: "Back", share: 0.4 },
      { name: "Hamstrings", share: 0.35 },
      { name: "Neck", share: 0.25 },
    ],
    exercises: [
      ex("childs-pose", "Child's Pose", 2, "45 sec", 20, ["Back"]),
      ex("hamstring-stretch", "Hamstring Stretch", 2, "30 sec each", 20, [
        "Hamstrings",
      ]),
      ex("neck-release", "Neck Release", 2, "30 sec each", 20, ["Neck"]),
      ex("breathing", "Slow Breathing", 1, "2 min", 0, ["Core"]),
    ],
  },
  {
    id: "steady-cardio",
    title: "Steady-State Cardio",
    subtitle: "A calm, continuous effort for heart health.",
    category: "cardio",
    minutes: 30,
    intensity: "Medium",
    equipment: "Bike, rower, or brisk walk",
    focus: "Heart · Endurance",
    icon: "heart",
    muscleGroups: [
      { name: "Legs", share: 0.6 },
      { name: "Heart", share: 0.4 },
    ],
    exercises: [
      ex("steady-warm", "Warm-Up", 1, "5 min", 0, ["Legs"]),
      ex("steady-main", "Steady Effort", 1, "20 min", 0, ["Legs"]),
      ex("steady-cool", "Cool-Down", 1, "5 min", 0, ["Legs"]),
    ],
  },
  {
    id: "low-impact-hiit",
    title: "Low-Impact Intervals",
    subtitle: "Raise the heart rate without pounding the joints.",
    category: "cardio",
    minutes: 20,
    intensity: "High",
    equipment: "None",
    focus: "Heart · Full body",
    icon: "zap",
    muscleGroups: [
      { name: "Legs", share: 0.4 },
      { name: "Core", share: 0.3 },
      { name: "Heart", share: 0.3 },
    ],
    exercises: [
      ex("march", "Fast March", 4, "45 sec on / 45 off", 45, ["Legs"]),
      ex("step-back", "Step-Back Lunge", 4, "45 sec on / 45 off", 45, ["Legs"]),
      ex("squat-pulse", "Squat Pulse", 4, "45 sec on / 45 off", 45, ["Legs"]),
    ],
  },
];

export function getWorkoutById(id: string | undefined | null) {
  return WORKOUT_LIBRARY.find((workout) => workout.id === id) || null;
}

// Readiness-aware recommendation: high readiness earns intensity, low readiness
// earns recovery — the Whoop principle, framed gently.
export function recommendWorkouts(readiness: number | null) {
  if (readiness == null) {
    return {
      headline: "Start where you are",
      workouts: [
        getWorkoutById("full-body-foundation")!,
        getWorkoutById("morning-mobility")!,
      ],
    };
  }
  if (readiness >= 70) {
    return {
      headline: "Your body is ready for a strong session",
      workouts: [
        getWorkoutById("upper-body-strength")!,
        getWorkoutById("lower-body-power")!,
      ],
    };
  }
  if (readiness >= 45) {
    return {
      headline: "A moderate session fits today",
      workouts: [
        getWorkoutById("full-body-foundation")!,
        getWorkoutById("steady-cardio")!,
      ],
    };
  }
  return {
    headline: "Recovery serves you best today",
    workouts: [
      getWorkoutById("evening-unwind")!,
      getWorkoutById("morning-mobility")!,
    ],
  };
}
