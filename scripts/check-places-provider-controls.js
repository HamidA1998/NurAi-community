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

function requireIncludes(text, relativePath, snippets, findings) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      findings.push(`${relativePath}: missing ${JSON.stringify(snippet)}`);
    }
  }
}

function main() {
  const findings = [];
  let serverText = "";
  let clientText = "";
  let exploreText = "";

  try {
    serverText = read("server/places.ts");
    clientText = read("client/screens/NearbyMosquesScreen.tsx");
    exploreText = read("client/screens/ExploreScreen.tsx");
  } catch (error) {
    findings.push(error instanceof Error ? error.message : String(error));
  }

  requireIncludes(
    serverText,
    "server/places.ts",
    [
      'import { sanitizeAIErrorMessage } from "./ai/errorSanitizer";',
      "function sendProviderUnconfigured",
      'process.env.NODE_ENV === "production"',
      'error: "places_provider_unconfigured"',
      "res.status(503).json",
      "function sendProviderError",
      'error: "places_provider_error"',
      "res.status(502).json",
      "Nearby search is temporarily unavailable. Please try again later.",
      "process.env.GEOAPIFY_API_KEY",
      "fetchGeoapifyNearby",
      "fetchGeoapifyHalalTextLeads",
      "fetchGeoapifyHalalCategoryLeads",
      "runGeoapifyLeadQueries",
      "sortNearbyHalalResults",
      "halalConfidenceRank",
      "isCateringLikeGeoapifyFeature",
      "isCuisineLeadQuery",
      "enrichSparseHalalResults",
      "Local halal lead",
      "Cuisine lead - confirm halal",
      "Expanded food lead - confirm halal",
      "Open map halal lead",
      "halal butcher",
      "halal grocery",
      "commercial.food_and_drink",
      "commercial.supermarket",
      "Sparse halal enrichment failed",
      "enrichedResults",
      "catering.fast_food.kebab",
      "halal takeout",
      "pepe's piri piri",
      "chickanos",
      "chunky chicken",
      'console.error("Geocode API error:", sanitizeAIErrorMessage(error))',
      'console.error("Places API error:", sanitizeAIErrorMessage(error))',
      "Google Places API key not configured. Using fallback search.",
    ],
    findings,
  );
  for (const unsafeSnippet of [
    'console.error("Geocode API error:", error.message)',
    'console.error("Places API error:", error.message)',
  ]) {
    if (serverText.includes(unsafeSnippet)) {
      findings.push(
        `server/places.ts: must not include ${JSON.stringify(unsafeSnippet)}`,
      );
    }
  }

  requireIncludes(
    clientText,
    "client/screens/NearbyMosquesScreen.tsx",
    [
      "class PlacesProviderError extends Error",
      "function isProductionProviderError",
      "function productionPlacesMessage",
      "function buildManualSearchUrl",
      "const fetchFallbackPlaces = useCallback",
      "renderDiscoveryAssistPanel",
      'testID="nearby-live-loading-panel"',
      'testID="nearby-reliability-rail"',
      "nearby-search-depth",
      "testID={`nearby-discovery-${mode}`}",
      'testID="nearby-empty-use-gps"',
      "nearby-empty-manual-maps",
      "nearby-sparse-manual-maps",
      'testID="nearby-change-location"',
      "Live mosque search needs a moment",
      "Live halal search needs a moment",
      "Open Maps",
      "!__DEV__",
      'error.code === "places_provider_unconfigured"',
      'error.code === "places_provider_error"',
      'const results = await fetchFallbackPlaces("mosque")',
      '? productionPlacesMessage("mosque")',
      "setMosquesFetched(true)",
      'const results = await fetchFallbackPlaces("halal")',
      '? productionPlacesMessage("halal")',
      "setHalalFetched(true)",
    ],
    findings,
  );

  requireIncludes(
    exploreText,
    "client/screens/ExploreScreen.tsx",
    ['screen: "NearbyMosques"', "Nearby Mosques", "Find mosques & halal food"],
    findings,
  );

  if (findings.length) {
    console.error("Places provider-control check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    "Places provider-control check passed: live provider failures fall back safely and expose a manual Maps escape route.",
  );
}

main();
