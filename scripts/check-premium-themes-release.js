#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const files = {
  theme: read("client/constants/theme.ts"),
  context: read("client/context/ThemeContext.tsx"),
  settings: read("client/screens/SettingsScreen.tsx"),
  more: read("client/screens/MoreScreen.tsx"),
  globalSearch: read("client/screens/GlobalSearchScreen.tsx"),
  packageJson: read("package.json"),
};

const findings = [];

function requireIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    findings.push(`${label} is missing ${JSON.stringify(needle)}`);
  }
}

[
  "THEME_SKIN_PRESETS",
  "dawn_pearl",
  "ruby_noor",
  "olive_gold",
  "haramain_gold",
  "zamzam_blue",
  "andalus_teal",
  "backgroundRoot",
  "backgroundDefault",
  "atmosphereTop",
  "atmosphereMid",
  "atmosphereBottom",
  "patternColor",
  "glowPrimary",
  "glowScholar",
  "surfaceStroke",
  "premiumHighlight",
  "surfaceGlass",
  "surfaceGlassStrong",
  "primaryForeground",
  "primaryBorder",
  "primaryText",
  "scholar",
].forEach((needle) => requireIncludes(files.theme, needle, "theme tokens"));

requireIncludes(
  files.context,
  "Object.keys(THEME_SKIN_PRESETS) as ThemeSkinId[]",
  "theme valid skin registry",
);
requireIncludes(files.context, "const isDark = true", "dark-only resolution");
requireIncludes(files.context, "Colors.dark", "dark-only base theme");
requireIncludes(
  files.context,
  'storedPref !== "dark"',
  "legacy appearance migration",
);
requireIncludes(
  files.settings,
  "NurAI night atmosphere",
  "settings dark-only explanation",
);
if (files.settings.includes("theme-option-light")) {
  findings.push("Settings must not expose a light-mode selector.");
}
if (files.more.includes("setPreference(")) {
  findings.push("More must not expose a theme toggle.");
}
if (files.globalSearch.includes("Light/Dark mode")) {
  findings.push("Global Search must not advertise retired light mode.");
}
requireIncludes(
  files.settings,
  "Object.values(THEME_SKIN_PRESETS)",
  "settings theme preset registry",
);
requireIncludes(files.settings, "skin.subtitle", "theme subtitle preview");
requireIncludes(files.settings, "skin.surface", "theme surface preview");
requireIncludes(files.settings, "skinPrimaryGlow", "theme layered preview");
requireIncludes(
  files.settings,
  "skinPreviewHorizon",
  "theme premium preview horizon",
);
requireIncludes(
  files.settings,
  "skinMiniSurface",
  "theme premium preview surface",
);
requireIncludes(
  files.settings,
  "skin.premium && !isPremium",
  "premium theme locking",
);
requireIncludes(
  read("client/components/premium/index.tsx"),
  "theme.atmosphereTop",
  "premium screen atmosphere tokens",
);
requireIncludes(
  read("client/components/premium/index.tsx"),
  "theme.patternColor",
  "premium screen pattern token",
);
requireIncludes(
  read("client/components/premium/index.tsx"),
  "theme.surfaceStroke",
  "premium card surface stroke token",
);
requireIncludes(
  files.settings,
  'navigation.navigate("Subscription", { initialTab: "premium" })',
  "premium theme upgrade route",
);

const packageJson = JSON.parse(files.packageJson);
if (
  packageJson.scripts?.["check:premium-themes-release"] !==
  "node scripts/check-premium-themes-release.js"
) {
  findings.push(
    "package.json must expose check:premium-themes-release for premium theme release guards.",
  );
}
if (
  !String(packageJson.scripts?.["check:release-local"] || "").includes(
    "check:premium-themes-release",
  )
) {
  findings.push(
    "package.json check:release-local must include check:premium-themes-release.",
  );
}

if (findings.length) {
  console.error("Premium themes release check failed:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  "Premium themes release check passed: dark-only resolution, legacy migration, presets, paid locking, previews, and theme token depth are wired.",
);
