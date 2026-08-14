#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(text, needle, label, findings) {
  if (!text.includes(needle)) {
    findings.push(`${label}: missing ${needle}`);
  }
}

function main() {
  const findings = [];
  const search = read("client/screens/GlobalSearchScreen.tsx");

  requireIncludes(
    search,
    "function getPrimarySearchResult",
    "Global search primary result ranking",
    findings,
  );
  requireIncludes(
    search,
    "priorityCategories.includes(result.category)",
    "Global search exact destination ranking",
    findings,
  );
  requireIncludes(
    search,
    "onSubmitEditing={handleSubmitSearch}",
    "Global search return-key navigation",
    findings,
  );
  requireIncludes(
    search,
    'testID="button-search-top-result"',
    "Global search best-match UI",
    findings,
  );
  requireIncludes(
    search,
    "SEARCH_STARTER_ACTIONS",
    "Global search command starter data",
    findings,
  );
  requireIncludes(
    search,
    'testID="global-search-command-rail"',
    "Global search command rail UI",
    findings,
  );
  requireIncludes(
    search,
    'id: "quran-ayah"',
    "Global search Quran starter",
    findings,
  );
  requireIncludes(
    search,
    'id: "travel-flight"',
    "Global search travel starter",
    findings,
  );
  requireIncludes(
    search,
    'id: "family-messages"',
    "Global search family starter",
    findings,
  );
  requireIncludes(
    search,
    'testID="global-search-result-summary"',
    "Global search result summary",
    findings,
  );
  requireIncludes(
    search,
    "SEARCH_SCOPE_FILTERS",
    "Global search scope filter data",
    findings,
  );
  requireIncludes(
    search,
    "function getResultSearchScope",
    "Global search scope classification",
    findings,
  );
  requireIncludes(
    search,
    "function filterSearchGroupsByScope",
    "Global search scoped result filtering",
    findings,
  );
  requireIncludes(
    search,
    'testID="global-search-scope-rail"',
    "Global search scope rail UI",
    findings,
  );
  requireIncludes(
    search,
    "testID={`global-search-scope-${scope.id}`}",
    "Global search scope chip test ids",
    findings,
  );
  requireIncludes(
    search,
    "accessibilityState={{ selected, disabled: count === 0 }}",
    "Global search scope accessibility state",
    findings,
  );
  requireIncludes(
    search,
    "No ${activeScopeLabel} matches",
    "Global search scoped empty state",
    findings,
  );
  requireIncludes(
    search,
    'testID="global-search-trust-boundary"',
    "Global search trust boundary UI",
    findings,
  );
  requireIncludes(
    search,
    "SEARCH_TRUST_LANES",
    "Global search trust lane data",
    findings,
  );
  requireIncludes(
    search,
    'testID="global-search-trust-lane-rail"',
    "Global search trust lane rail",
    findings,
  );
  requireIncludes(
    search,
    "testID={`global-search-trust-lane-${lane.id}`}",
    "Global search trust lane test ids",
    findings,
  );
  requireIncludes(
    search,
    'label: "Scholar Review"',
    "Global search scholar review lane",
    findings,
  );
  requireIncludes(
    search,
    'helper: "Sensitive questions"',
    "Global search sensitive-question lane copy",
    findings,
  );
  requireIncludes(
    search,
    "Destinations first. Quran, library, travel, family, and tools stay",
    "Global search destination-first trust copy",
    findings,
  );
  requireIncludes(
    search,
    "qualified human guidance",
    "Global search scholar review escalation copy",
    findings,
  );
  requireIncludes(
    search,
    "Search destinations, Quran, library, tools, and source references",
    "Global search input accessibility label",
    findings,
  );
  requireIncludes(
    search,
    "EMPTY_STATE_SUGGESTIONS.map",
    "Global search empty-state recovery chips",
    findings,
  );
  requireIncludes(
    search,
    "Try an exact ayah, a tool name, a book title, or a flight number.",
    "Global search empty-state destination recovery copy",
    findings,
  );
  requireIncludes(
    search,
    'screen: "BookReader"',
    "Book chapter deep link",
    findings,
  );
  requireIncludes(
    search,
    "ISLAMIC_CALENDAR_EVENTS",
    "Islamic calendar event index",
    findings,
  );
  requireIncludes(
    search,
    "initialEventId",
    "Islamic calendar event deep link",
    findings,
  );
  requireIncludes(
    search,
    "HADITH_COLLECTIONS",
    "Real hadith source index",
    findings,
  );
  requireIncludes(
    search,
    "initialCollectionId",
    "Hadith collection deep link",
    findings,
  );
  requireIncludes(
    search,
    "initialSearchQuery",
    "Hadith source search deep link",
    findings,
  );
  requireIncludes(
    search,
    "NAMES_OF_ALLAH_INDEX",
    "Names of Allah search index",
    findings,
  );
  requireIncludes(
    search,
    "Dhul-Jalali Wal-Ikram",
    "Full 99 Names search coverage",
    findings,
  );
  requireIncludes(
    search,
    "Al-Mu'min",
    "Expanded Names of Allah search coverage",
    findings,
  );
  requireIncludes(
    search,
    "initialSearch",
    "Names of Allah deep search",
    findings,
  );
  requireIncludes(
    search,
    "buildAdhkarResults",
    "Adhkar search result builder",
    findings,
  );
  requireIncludes(
    search,
    "params: { initialCategory: d.category }",
    "Dua category deep link",
    findings,
  );
  requireIncludes(
    search,
    "params: { initialTab: item.tab }",
    "Adhkar tab deep link",
    findings,
  );
  requireIncludes(
    search,
    "Ayatul Kursi",
    "Adhkar content search keywords",
    findings,
  );
  requireIncludes(
    search,
    'initialCategory: "Dhikr"',
    "Nasheed category deep link",
    findings,
  );
  requireIncludes(search, "initialVerse", "Quran ayah deep link", findings);
  requireIncludes(
    search,
    'initialStudyMode: "words"',
    "Quran word-intelligence deep link",
    findings,
  );
  requireIncludes(
    search,
    'initialTab: "halal"',
    "Nearby halal deep link",
    findings,
  );
  requireIncludes(
    search,
    'initialTab: "messages"',
    "Family messages deep link",
    findings,
  );
  requireIncludes(
    search,
    'initialTab: "challenges"',
    "Family goals/challenges deep link",
    findings,
  );
  requireIncludes(
    search,
    "quran-recitation-coach",
    "Quran recitation coach search command",
    findings,
  );
  requireIncludes(
    search,
    "home-widgets",
    "Widget setup search command",
    findings,
  );
  requireIncludes(
    search,
    "backup-restore",
    "Backup and restore search command",
    findings,
  );
  requireIncludes(
    search,
    "source-library",
    "Source-backed library search command",
    findings,
  );
  requireIncludes(
    search,
    "normalizeSearchText",
    "Typo-tolerant global search normalizer",
    findings,
  );

  if (/groups\.unshift\(\{\s*category:\s*"Ask NurAI"/.test(search)) {
    findings.push(
      "Global search should not rank Ask NurAI above exact app destinations.",
    );
  }
  for (const staleNeedle of [
    "listSavedAIAnswers",
    "buildSavedAIAnswerResults",
    "Saved AI Answers",
    'testID="button-global-search-ask-nurai"',
    'actionLabel: "Ask source-aware"',
  ]) {
    if (search.includes(staleNeedle)) {
      findings.push(
        `Global search should not include stale AI surface ${staleNeedle}.`,
      );
    }
  }

  if (findings.length) {
    console.error("Global search release check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Global search release check passed: exact destinations, deep links, return-key navigation, and stripped-back search recovery verified.",
  );
}

main();
