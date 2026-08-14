#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const files = {
  service: read("client/services/muslimHealthService.ts"),
  screen: read("client/screens/MuslimHealthScreen.tsx"),
  navigator: read("client/navigation/RootStackNavigator.tsx"),
  app: read("client/App.tsx"),
  more: read("client/screens/MoreScreen.tsx"),
  home: read("client/screens/HomeScreen.tsx"),
  search: read("client/screens/GlobalSearchScreen.tsx"),
  packageJson: read("package.json"),
  primitives: read("client/components/health/HealthPrimitives.tsx"),
  healthHome: read("client/screens/health/HealthHomeScreen.tsx"),
  healthRecovery: read("client/screens/health/HealthRecoveryScreens.tsx"),
  healthWorkouts: read("client/screens/health/HealthWorkoutScreens.tsx"),
  healthLifestyle: read("client/screens/health/HealthLifestyleScreens.tsx"),
  healthLogs: read("client/services/healthLocalLogs.ts"),
  workoutLibrary: read("client/constants/workoutLibrary.ts"),
};

const findings = [];

function requireIncludes(source, needle, label) {
  if (!source.includes(needle))
    findings.push(`${label} is missing "${needle}"`);
}

requireIncludes(
  files.service,
  "MUSLIM_HEALTH_STORAGE_KEY",
  "Health privacy-local storage key",
);
requireIncludes(
  files.service,
  "buildMuslimHealthPlan",
  "Daily Muslim health plan builder",
);
requireIncludes(
  files.service,
  "toggleMuslimHealthAction",
  "Daily health action completion",
);
requireIncludes(
  files.service,
  "NurAI does not change medication, diagnose symptoms, or replace clinicians.",
  "Medical diagnosis boundary",
);
requireIncludes(files.service, "Quran 2:195", "Harm-prevention source anchor");
requireIncludes(files.service, "Quran 7:31", "Moderation source anchor");
requireIncludes(
  files.service,
  "Do not diagnose, prescribe, change medication",
  "AI prompt medical safety boundary",
);
requireIncludes(
  files.screen,
  "Health Companion",
  "Health Companion screen title",
);
requireIncludes(
  files.screen,
  "testID={`muslim-health-action-${action.id}`}",
  "Health action test hooks",
);
requireIncludes(
  files.screen,
  'testID="muslim-health-boundaries"',
  "Health boundary test hook",
);
requireIncludes(
  files.screen,
  "It does not diagnose symptoms",
  "Visible medical safety copy",
);
requireIncludes(
  files.navigator,
  "MuslimHealthScreen",
  "Navigator imports Muslim health screen",
);
requireIncludes(
  files.navigator,
  'name="MuslimHealth"',
  "Navigator registers MuslimHealth route",
);
requireIncludes(files.app, 'health: "MuslimHealth"', "Health deep link");
requireIncludes(files.more, "Health Companion", "More screen health entry");
requireIncludes(files.more, "Body amanah", "More quick health route");
requireIncludes(files.home, "muslim_health", "Home health quick feature");
requireIncludes(
  files.search,
  "muslim-health-companion",
  "Global search health result",
);
requireIncludes(
  files.packageJson,
  '"check:muslim-health-release"',
  "Package Muslim health release script",
);

for (const route of [
  "MuslimHealth",
  "HealthReadiness",
  "HealthSleep",
  "WorkoutHub",
  "WorkoutDetail",
  "LiveWorkout",
  "WorkoutSummary",
  "HealthProgress",
  "HealthCoach",
  "Hydration",
  "Nutrition",
  "ConnectedHealth",
]) {
  requireIncludes(files.navigator, `name="${route}"`, `Health route ${route}`);
}
requireIncludes(
  files.navigator,
  'name="HealthSignals"',
  "Legacy Health Signals route",
);
requireIncludes(
  files.primitives,
  "useHealthData",
  "Shared real health data hook",
);
requireIncludes(
  files.primitives,
  "useReducedMotion",
  "Reduced-motion health score ring",
);
requireIncludes(
  files.primitives,
  "Real health data only",
  "Honest no-data state",
);
requireIncludes(
  files.healthHome,
  'testID="health-home-screen"',
  "Health home smoke hook",
);
requireIncludes(
  files.healthRecovery,
  'testID="health-readiness-screen"',
  "Readiness smoke hook",
);
requireIncludes(
  files.healthRecovery,
  'testID="health-sleep-screen"',
  "Sleep smoke hook",
);
requireIncludes(
  files.healthRecovery,
  'testID="health-progress-screen"',
  "Progress smoke hook",
);
requireIncludes(
  files.healthWorkouts,
  'testID="workout-hub-screen"',
  "Workout hub smoke hook",
);
requireIncludes(
  files.healthWorkouts,
  'testID="live-workout-screen"',
  "Live workout smoke hook",
);
requireIncludes(
  files.healthWorkouts,
  "addWorkoutHistoryEntry",
  "Persisted completed workouts",
);
for (const marker of [
  "loadActiveWorkoutSession",
  "saveActiveWorkoutSession",
  "clearActiveWorkoutSession",
  "Session recovered",
  'AppState.addEventListener("change"',
]) {
  requireIncludes(
    files.healthWorkouts,
    marker,
    `Recoverable workout session contract ${marker}`,
  );
}
requireIncludes(
  files.healthLifestyle,
  'testID="health-coach-screen"',
  "Health Coach smoke hook",
);
requireIncludes(
  files.healthLifestyle,
  'testID="hydration-screen"',
  "Hydration smoke hook",
);
requireIncludes(
  files.healthLifestyle,
  'testID="nutrition-screen"',
  "Nutrition smoke hook",
);
requireIncludes(
  files.healthLifestyle,
  'testID="connected-health-screen"',
  "Connected Health smoke hook",
);
requireIncludes(
  files.healthLifestyle,
  "A supported health provider is not available on this device.",
  "Honest unsupported-provider state",
);
requireIncludes(
  files.healthLifestyle,
  "privateContextLines",
  "Private Health Coach context",
);
requireIncludes(files.healthLogs, "AsyncStorage", "On-device health logs");
for (const marker of [
  "ACTIVE_WORKOUT_KEY",
  "loadActiveWorkoutSession",
  "saveActiveWorkoutSession",
  "clearActiveWorkoutSession",
  "12 * 60 * 60 * 1000",
]) {
  requireIncludes(
    files.healthLogs,
    marker,
    `Active workout recovery storage ${marker}`,
  );
}
requireIncludes(
  files.workoutLibrary,
  "recommendWorkouts",
  "Readiness-aware workout selection",
);

if (findings.length) {
  console.error("Muslim Health release check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  "Muslim Health release check passed: daily care plan, safety boundaries, navigation, search, and source anchors are wired.",
);
