import type { Express, Request, Response } from "express";
import { sanitizeAIErrorMessage } from "./ai/errorSanitizer";
import { requireAuthenticatedUser } from "./requestAuth";
import {
  durableRateLimiter,
  getAIRateLimitSubjectFromRequest,
} from "./ai/rateLimit";

async function enforcePlacesRateLimit(
  req: Request,
  res: Response,
): Promise<boolean> {
  const decision = await durableRateLimiter.check(
    getAIRateLimitSubjectFromRequest(req),
    {
      namespace: "places",
      windowMs: 60_000,
      maxRequests: 30,
    },
  );
  res.setHeader("X-RateLimit-Limit", String(decision.limit));
  res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
  if (decision.allowed) return true;
  res.setHeader("Retry-After", String(Math.ceil(decision.retryAfterMs / 1000)));
  res.status(429).json({ error: "Too many place searches. Please wait." });
  return false;
}

function parseCoordinate(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function sendProviderUnconfigured(res: Response) {
  if (isProductionRuntime()) {
    return res.status(503).json({
      error: "places_provider_unconfigured",
      message:
        "Nearby search is temporarily unavailable. Please try again later.",
    });
  }

  return res.status(200).json({
    results: [],
    fallback: true,
    message: "Google Places API key not configured. Using fallback search.",
  });
}

function sendProviderError(res: Response, data: any, fallbackMessage: string) {
  const providerStatus = typeof data?.status === "string" ? data.status : null;
  const providerMessage =
    typeof data?.error_message === "string" && data.error_message.trim()
      ? data.error_message
      : fallbackMessage;

  if (isProductionRuntime()) {
    console.warn("Places provider error:", {
      providerStatus,
      message: sanitizeAIErrorMessage(providerMessage),
    });
    return res.status(502).json({
      error: "places_provider_error",
      providerStatus,
      message:
        "Nearby search is temporarily unavailable. Please try again later.",
    });
  }

  return res.json({
    results: [],
    fallback: true,
    message: providerMessage,
  });
}

function guessCalculationMethod(countryName: string): string {
  const lower = countryName.toLowerCase();
  if (
    lower.includes("united kingdom") ||
    lower.includes("uk") ||
    lower.includes("england") ||
    lower.includes("scotland") ||
    lower.includes("wales") ||
    lower.includes("northern ireland") ||
    lower.includes("ireland")
  ) {
    return "MoonsightingCommittee";
  }
  if (lower.includes("saudi")) return "UmmAlQura";
  if (lower.includes("egypt")) return "Egyptian";
  if (lower.includes("turkey") || lower.includes("türkiye")) return "Turkey";
  if (lower.includes("iran")) return "Tehran";
  if (
    lower.includes("pakistan") ||
    lower.includes("india") ||
    lower.includes("bangladesh") ||
    lower.includes("afghanistan")
  ) {
    return "Karachi";
  }
  if (
    lower.includes("united states") ||
    lower.includes("usa") ||
    lower.includes("canada")
  ) {
    return "NorthAmerica";
  }
  if (lower.includes("qatar")) return "Qatar";
  if (lower.includes("kuwait")) return "Kuwait";
  if (lower.includes("singapore")) return "Singapore";
  if (lower.includes("uae") || lower.includes("emirates")) return "Dubai";
  return "MuslimWorldLeague";
}

function textFromMapboxContext(
  context: Record<string, { name?: string } | undefined> | undefined,
  key: string,
): string {
  const value = context?.[key]?.name;
  return typeof value === "string" ? value : "";
}

function mapMapboxLocationFeature(feature: any) {
  const coordinates = Array.isArray(feature?.geometry?.coordinates)
    ? feature.geometry.coordinates
    : Array.isArray(feature?.properties?.coordinates)
      ? [
          feature.properties.coordinates.longitude,
          feature.properties.coordinates.latitude,
        ]
      : null;
  const longitude = Number(coordinates?.[0]);
  const latitude = Number(coordinates?.[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const context = feature?.properties?.context;
  const featureName =
    typeof feature?.properties?.name === "string"
      ? feature.properties.name
      : typeof feature?.text === "string"
        ? feature.text
        : typeof feature?.place_name === "string"
          ? feature.place_name.split(",")[0]
          : "Selected location";
  const cityName =
    textFromMapboxContext(context, "place") ||
    textFromMapboxContext(context, "locality") ||
    textFromMapboxContext(context, "district") ||
    textFromMapboxContext(context, "region") ||
    featureName;
  const countryName = textFromMapboxContext(context, "country");
  const regionName = textFromMapboxContext(context, "region");
  const label =
    typeof feature?.properties?.full_address === "string"
      ? feature.properties.full_address
      : typeof feature?.properties?.place_formatted === "string"
        ? [featureName, feature.properties.place_formatted]
            .filter(Boolean)
            .join(", ")
        : typeof feature?.place_name === "string"
          ? feature.place_name
          : [cityName, regionName, countryName].filter(Boolean).join(", ");

  return {
    label,
    cityName,
    regionName,
    countryName,
    latitude,
    longitude,
    calculationMethod: guessCalculationMethod(countryName || regionName),
    source: "mapbox",
  };
}

function extractGoogleAddressPart(result: any, type: string): string {
  const component = (result?.address_components || []).find((part: any) =>
    Array.isArray(part.types) ? part.types.includes(type) : false,
  );
  return typeof component?.long_name === "string" ? component.long_name : "";
}

function mapGoogleLocationResult(result: any) {
  const latitude = Number(result?.geometry?.location?.lat);
  const longitude = Number(result?.geometry?.location?.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const cityName =
    extractGoogleAddressPart(result, "locality") ||
    extractGoogleAddressPart(result, "postal_town") ||
    extractGoogleAddressPart(result, "administrative_area_level_2") ||
    extractGoogleAddressPart(result, "administrative_area_level_1") ||
    (typeof result?.formatted_address === "string"
      ? result.formatted_address.split(",")[0]
      : "Selected location");
  const regionName = extractGoogleAddressPart(
    result,
    "administrative_area_level_1",
  );
  const countryName = extractGoogleAddressPart(result, "country");

  return {
    label:
      result?.formatted_address ||
      [cityName, regionName, countryName].filter(Boolean).join(", "),
    cityName,
    regionName,
    countryName,
    latitude,
    longitude,
    calculationMethod: guessCalculationMethod(countryName || regionName),
    source: "google",
  };
}

function mapGeoapifyLocationFeature(feature: any) {
  const props = feature?.properties || {};
  const longitude = Number(props.lon ?? feature?.geometry?.coordinates?.[0]);
  const latitude = Number(props.lat ?? feature?.geometry?.coordinates?.[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const cityName =
    props.city ||
    props.town ||
    props.village ||
    props.county ||
    props.state ||
    props.name ||
    "Selected location";
  const countryName = props.country || "";
  const regionName = props.state || props.county || "";
  const label =
    props.formatted ||
    [cityName, regionName, countryName].filter(Boolean).join(", ");

  return {
    label,
    cityName,
    regionName,
    countryName,
    latitude,
    longitude,
    calculationMethod: guessCalculationMethod(countryName || regionName),
    source: "geoapify",
  };
}

function dedupeLocationResults<
  T extends { latitude: number; longitude: number; label: string },
>(results: T[]): T[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.label.toLowerCase()}_${result.latitude.toFixed(3)}_${result.longitude.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildOverpassNearbyQuery(
  type: "mosque" | "halal" | "prayer_room",
  latitude: number,
  longitude: number,
  radius: number,
): string {
  if (type === "mosque") {
    return `[out:json][timeout:12];(node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${latitude},${longitude});way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${latitude},${longitude}););out center body;`;
  }
  if (type === "prayer_room") {
    // Airport/terminal prayer facilities are rarely tagged religion=muslim —
    // they're usually a generic multi-faith room. Match the amenity tag plus
    // the room-naming convention airports actually use in OpenStreetMap.
    const namePattern =
      "prayer room|prayer hall|multi.?faith|reflection room|meditation room|quiet room|wudu|ablution";
    return `[out:json][timeout:12];(node["amenity"="place_of_worship"](around:${radius},${latitude},${longitude});way["amenity"="place_of_worship"](around:${radius},${latitude},${longitude});node["room"="prayer_room"](around:${radius},${latitude},${longitude});way["room"="prayer_room"](around:${radius},${latitude},${longitude});node["name"~"${namePattern}",i](around:${radius},${latitude},${longitude});way["name"~"${namePattern}",i](around:${radius},${latitude},${longitude}););out center body;`;
  }
  const halalNamePattern =
    "halal|kebab|shawarma|doner|donner|peri peri|piri piri|grill|chicken|burger|biryani|karahi|lahori|desi|pakistani|turkish|lebanese|arabic|afghan|middle eastern|indian|bangladeshi|bengali|butcher|meat|poultry";
  return `[out:json][timeout:20];(node["diet:halal"="yes"](around:${radius},${latitude},${longitude});way["diet:halal"="yes"](around:${radius},${latitude},${longitude});node["diet:halal"="only"](around:${radius},${latitude},${longitude});way["diet:halal"="only"](around:${radius},${latitude},${longitude});node["cuisine"~"halal",i](around:${radius},${latitude},${longitude});way["cuisine"~"halal",i](around:${radius},${latitude},${longitude});node["amenity"~"restaurant|fast_food|cafe|food_court|ice_cream"]["cuisine"~"${halalNamePattern}",i](around:${radius},${latitude},${longitude});way["amenity"~"restaurant|fast_food|cafe|food_court|ice_cream"]["cuisine"~"${halalNamePattern}",i](around:${radius},${latitude},${longitude});node["amenity"~"restaurant|fast_food|cafe|food_court|ice_cream"]["name"~"${halalNamePattern}",i](around:${radius},${latitude},${longitude});way["amenity"~"restaurant|fast_food|cafe|food_court|ice_cream"]["name"~"${halalNamePattern}",i](around:${radius},${latitude},${longitude});node["shop"~"butcher|supermarket|convenience|grocery"]["name"~"${halalNamePattern}",i](around:${radius},${latitude},${longitude});way["shop"~"butcher|supermarket|convenience|grocery"]["name"~"${halalNamePattern}",i](around:${radius},${latitude},${longitude}););out center body;`;
}

function nearbyDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const radiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseOverpassNearbyResults(
  data: any,
  type: "mosque" | "halal" | "prayer_room",
  latitude: number,
  longitude: number,
) {
  const seen = new Set<string>();
  const fallbackName =
    type === "mosque"
      ? "Masjid"
      : type === "prayer_room"
        ? "Prayer room"
        : "Halal place";
  const elements = Array.isArray(data?.elements) ? data.elements : [];
  return elements
    .map((element: any) => {
      const lat = Number(element?.lat ?? element?.center?.lat);
      const lng = Number(element?.lon ?? element?.center?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const tags = element?.tags || {};
      const name = typeof tags.name === "string" ? tags.name : fallbackName;
      const key = `${name.toLowerCase()}_${lat.toFixed(5)}_${lng.toFixed(5)}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const address = [
        tags["addr:housenumber"],
        tags["addr:street"],
        tags["addr:city"],
      ]
        .filter((part) => typeof part === "string" && part.trim())
        .join(", ");
      return {
        name,
        latitude: lat,
        longitude: lng,
        address,
        rating: null,
        totalRatings: 0,
        openNow: null,
        placeId: `osm:${element.type}:${element.id}`,
        distance: nearbyDistanceKm(latitude, longitude, lat, lng),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.distance - b.distance)
    .slice(0, 25)
    .map(({ distance, ...result }: any) => result);
}

async function fetchOverpassNearby(
  type: "mosque" | "halal" | "prayer_room",
  latitude: number,
  longitude: number,
  radius: number,
) {
  const query = buildOverpassNearbyQuery(type, latitude, longitude, radius);
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Overpass fallback failed: ${response.status}`);
  }
  const data = await response.json();
  return parseOverpassNearbyResults(data, type, latitude, longitude);
}

function mapGeoapifyPlaceFeature(
  feature: any,
  type: "mosque" | "halal" | "prayer_room",
  latitude: number,
  longitude: number,
) {
  const props = feature?.properties || {};
  const lat = Number(props.lat ?? feature?.geometry?.coordinates?.[1]);
  const lng = Number(props.lon ?? feature?.geometry?.coordinates?.[0]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const fallbackName =
    type === "mosque"
      ? "Masjid"
      : type === "prayer_room"
        ? "Prayer room"
        : "Halal place";
  const name =
    typeof props.name === "string" && props.name.trim()
      ? props.name.trim()
      : fallbackName;
  const address =
    props.formatted ||
    [props.address_line1, props.address_line2].filter(Boolean).join(", ");

  return {
    name,
    latitude: lat,
    longitude: lng,
    address,
    rating: null,
    totalRatings: 0,
    openNow: null,
    confidenceLabel:
      type === "halal" ? "Provider halal tag" : "Provider place result",
    placeId:
      typeof props.place_id === "string"
        ? `geoapify:${props.place_id}`
        : `geoapify:${name}:${lat.toFixed(5)}:${lng.toFixed(5)}`,
    distance: nearbyDistanceKm(latitude, longitude, lat, lng),
  };
}

function halalConfidenceRank(place: any): number {
  const label = String(place?.confidenceLabel || "").toLowerCase();
  const name = String(place?.name || "").toLowerCase();
  const address = String(place?.address || "").toLowerCase();
  const text = `${label} ${name} ${address}`;
  if (/\b(provider halal tag|diet:halal|halal tag)\b/i.test(text)) return 0;
  if (/\b(local halal lead|open map halal lead)\b/i.test(text)) return 1;
  if (/\b(halal|dixy|dixie|pepe'?s|kebab|shawarma)\b/i.test(text)) return 2;
  if (/\b(cuisine lead|expanded food lead)\b/i.test(text)) return 3;
  return 4;
}

function sortNearbyHalalResults<T extends { distance?: number }>(results: T[]) {
  return results.sort((a: any, b: any) => {
    const confidenceDelta = halalConfidenceRank(a) - halalConfidenceRank(b);
    if (confidenceDelta !== 0) return confidenceDelta;
    return Number(a.distance || 999) - Number(b.distance || 999);
  });
}

async function fetchGeoapifyNearby(
  apiKey: string,
  type: "mosque" | "halal" | "prayer_room",
  latitude: number,
  longitude: number,
  radius: number,
) {
  const providerRadius =
    type === "halal" ? Math.min(Math.max(radius, 20000), 25000) : radius;
  const url = new URL("https://api.geoapify.com/v2/places");
  if (type === "mosque") {
    url.searchParams.set("categories", "religion.place_of_worship.islam");
  } else {
    url.searchParams.set(
      "categories",
      "catering,catering.restaurant,catering.fast_food,catering.fast_food.kebab,catering.fast_food.burger,catering.fast_food.pizza,catering.cafe,catering.food_court",
    );
    url.searchParams.set("conditions", "halal");
  }
  url.searchParams.set(
    "filter",
    `circle:${longitude},${latitude},${providerRadius}`,
  );
  url.searchParams.set("bias", `proximity:${longitude},${latitude}`);
  url.searchParams.set("limit", "25");
  url.searchParams.set("lang", "en");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url.toString());
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data?.features)) {
    throw new Error(
      `Geoapify nearby failed: ${response.status} ${data?.message || ""}`,
    );
  }
  const strictResults = data.features
    .map((feature: any) =>
      mapGeoapifyPlaceFeature(feature, type, latitude, longitude),
    )
    .filter(Boolean)
    .sort((a: any, b: any) => a.distance - b.distance);

  if (type !== "halal" || strictResults.length >= 10) {
    return strictResults
      .slice(0, 25)
      .map(({ distance, ...result }: any) => result);
  }

  const textLeads = await fetchGeoapifyHalalTextLeads(
    apiKey,
    latitude,
    longitude,
    providerRadius,
  );
  const categoryLeads = await fetchGeoapifyHalalCategoryLeads(
    apiKey,
    latitude,
    longitude,
    providerRadius,
  );
  let osmLeads: any[] = [];
  try {
    osmLeads = await fetchOverpassNearby(
      "halal",
      latitude,
      longitude,
      providerRadius,
    );
  } catch (error: unknown) {
    console.warn(
      "OpenStreetMap halal enrichment failed:",
      sanitizeAIErrorMessage(error),
    );
  }
  const osmLeadsWithDistance = osmLeads.map((place: any) => ({
    ...place,
    distance:
      typeof place.distance === "number"
        ? place.distance
        : nearbyDistanceKm(
            latitude,
            longitude,
            place.latitude,
            place.longitude,
          ),
  }));
  return sortNearbyHalalResults(
    dedupeNearbyResults([
      ...strictResults,
      ...textLeads,
      ...categoryLeads,
      ...osmLeadsWithDistance,
    ]),
  )
    .slice(0, 25)
    .map(({ distance, ...result }: any) => result);
}

function isNonRestaurantHalalLead(text: string): boolean {
  return /\b(warehouse|co-operative|co-op|m&s simply food)\b/i.test(text);
}

function isStrongHalalFoodLead(text: string): boolean {
  return /\b(halal|kebab|shawarma|karahi|lahori|peri[\s-]?peri|piri[\s-]?piri|kebabish|doner|donner|turkish|lebanese|pakistani|afghan|arabic|middle eastern|indian|bangladeshi|bengali|desi|biryani|curry|grill|grilled|chicken|fried chicken|burger|burgers|pizza|steak|bbq|barbecue|dixy|dixie|pepe'?s|pepes|roosters|sizzler|butcher|butchers|meat|meats|poultry|chickanos|chunky chicken|chicken cottage|miami crispy|rio'?s|sfc|sizzlers?|grillaz|flames?|takeaway)\b/i.test(
    text,
  );
}

function isCateringLikeGeoapifyFeature(feature: any): boolean {
  const props = feature?.properties || {};
  const categories = Array.isArray(props.categories)
    ? props.categories.join(" ")
    : "";
  const datasource = props.datasource?.raw || {};
  const amenity = String(datasource.amenity || "");
  const cuisine = String(datasource.cuisine || "");
  return /\b(catering|restaurant|fast_food|cafe|food_court|takeaway|food|kebab|pizza|burger|chicken|grill|curry|biryani)\b/i.test(
    `${categories} ${amenity} ${cuisine}`,
  );
}

function isCuisineLeadQuery(query: string): boolean {
  return /\b(kebab|shawarma|peri[\s-]?peri|piri[\s-]?piri|pakistani|turkish|middle eastern|lebanese|afghan|indian|bangladeshi|bengali|biryani|karahi|grill|chicken|burger|pizza|takeaway|restaurant|butcher|grocery)\b/i.test(
    query,
  );
}

function mapGeoapifyTextLeadFeature(
  feature: any,
  latitude: number,
  longitude: number,
  query: string,
) {
  const props = feature?.properties || {};
  const lat = Number(props.lat ?? feature?.geometry?.coordinates?.[1]);
  const lng = Number(props.lon ?? feature?.geometry?.coordinates?.[0]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const name =
    typeof props.name === "string" && props.name.trim()
      ? props.name.trim()
      : "";
  const formatted = typeof props.formatted === "string" ? props.formatted : "";
  const haystack = `${name} ${formatted}`;
  if (!name || isNonRestaurantHalalLead(haystack)) return null;
  const strongLead = isStrongHalalFoodLead(haystack);
  const cuisineLead =
    isCuisineLeadQuery(query) && isCateringLikeGeoapifyFeature(feature);
  if (!strongLead && !cuisineLead) return null;
  const genericCategoryLead =
    cuisineLead && /^geoapify-category:/i.test(query) && !strongLead;

  return {
    name,
    latitude: lat,
    longitude: lng,
    address: `Possible halal lead - confirm before relying on it. ${formatted}`,
    rating: null,
    totalRatings: 0,
    openNow: null,
    confidenceLabel: strongLead
      ? "Local halal lead"
      : genericCategoryLead
        ? "Expanded food lead - confirm halal"
        : "Cuisine lead - confirm halal",
    placeId:
      typeof props.place_id === "string"
        ? `geoapify-text:${props.place_id}`
        : `geoapify-text:${name}:${lat.toFixed(5)}:${lng.toFixed(5)}`,
    distance: nearbyDistanceKm(latitude, longitude, lat, lng),
  };
}

function dedupeNearbyResults(results: any[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${String(result.name || "").toLowerCase()}_${Number(result.latitude).toFixed(4)}_${Number(result.longitude).toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const HALAL_TEXT_LEAD_QUERIES = [
  "halal restaurant",
  "halal takeaway",
  "halal food",
  "halal dining",
  "halal fast food",
  "halal near me",
  "halal restaurants open",
  "halal takeout",
  "kebab",
  "kebab takeaway",
  "turkish kebab",
  "shawarma",
  "shawarma takeaway",
  "peri peri",
  "piri piri",
  "peri peri chicken",
  "halal grill",
  "halal chicken",
  "fried chicken halal",
  "chicken takeaway halal",
  "halal burgers",
  "halal pizza",
  "halal cafe",
  "halal butcher",
  "halal meat",
  "halal grocery",
  "pakistani restaurant",
  "pakistani takeaway",
  "turkish restaurant",
  "middle eastern restaurant",
  "lebanese restaurant",
  "afghan restaurant",
  "indian restaurant halal",
  "bangladeshi restaurant",
  "biryani",
  "karahi",
  "grill restaurant",
  "dixy chicken",
  "dixie chicken",
  "pepes piri piri",
  "pepe's piri piri",
  "chickanos",
  "chunky chicken",
  "chicken cottage",
  "miami crispy",
  "rio's piri piri",
  "sfc chicken",
  "grillaz",
  "flames grill",
  "dessert halal",
  "steakhouse halal",
  "smash burger halal",
  "loaded fries halal",
];

async function runGeoapifyLeadQueries<T>(
  items: string[],
  runner: (item: string) => Promise<T[]>,
  batchSize = 6,
) {
  const results: T[] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const settled = await Promise.allSettled(batch.map(runner));
    for (const item of settled) {
      if (item.status === "fulfilled") results.push(...item.value);
    }
  }
  return results;
}

async function fetchGeoapifyHalalCategoryLeads(
  apiKey: string,
  latitude: number,
  longitude: number,
  radius: number,
) {
  const categories = [
    "catering.restaurant",
    "catering.fast_food",
    "catering.fast_food.kebab",
    "catering.fast_food.burger",
    "catering.fast_food.pizza",
    "catering.cafe",
    "catering.food_court",
    "commercial.food_and_drink",
    "commercial.supermarket",
  ];
  const results: any[] = [];

  const categoryResults = await runGeoapifyLeadQueries(
    categories,
    async (category) => {
      const url = new URL("https://api.geoapify.com/v2/places");
      url.searchParams.set("categories", category);
      url.searchParams.set(
        "filter",
        `circle:${longitude},${latitude},${radius}`,
      );
      url.searchParams.set("bias", `proximity:${longitude},${latitude}`);
      url.searchParams.set("limit", "60");
      url.searchParams.set("lang", "en");
      url.searchParams.set("apiKey", apiKey);

      const response = await fetch(url.toString());
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data?.features)) return [];
      return data.features
        .map((feature: any) =>
          mapGeoapifyTextLeadFeature(
            feature,
            latitude,
            longitude,
            `geoapify-category:${category}`,
          ),
        )
        .filter(Boolean);
    },
  );
  results.push(...categoryResults);

  return sortNearbyHalalResults(dedupeNearbyResults(results)).slice(0, 20);
}

async function fetchGeoapifyHalalTextLeads(
  apiKey: string,
  latitude: number,
  longitude: number,
  radius: number,
) {
  const results: any[] = [];

  const textResults = await runGeoapifyLeadQueries(
    HALAL_TEXT_LEAD_QUERIES,
    async (query) => {
      const url = new URL("https://api.geoapify.com/v1/geocode/search");
      url.searchParams.set("text", query);
      url.searchParams.set(
        "filter",
        `circle:${longitude},${latitude},${radius}`,
      );
      url.searchParams.set("bias", `proximity:${longitude},${latitude}`);
      url.searchParams.set("limit", "20");
      url.searchParams.set("lang", "en");
      url.searchParams.set("apiKey", apiKey);

      const response = await fetch(url.toString());
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data?.features)) return [];
      return data.features
        .map((feature: any) =>
          mapGeoapifyTextLeadFeature(feature, latitude, longitude, query),
        )
        .filter(Boolean);
    },
  );
  results.push(...textResults);

  return sortNearbyHalalResults(dedupeNearbyResults(results)).slice(0, 18);
}

async function enrichSparseHalalResults(
  results: any[],
  latitude: number,
  longitude: number,
  radius: number,
) {
  if (results.length >= 10) return results;

  try {
    const osmLeads = await fetchOverpassNearby(
      "halal",
      latitude,
      longitude,
      Math.max(radius, 25000),
    );
    return sortNearbyHalalResults(
      dedupeNearbyResults(
        [...results, ...osmLeads].map((place: any) => ({
          ...place,
          confidenceLabel:
            place.confidenceLabel ||
            (String(place.placeId || "").startsWith("osm:")
              ? "Open map halal lead"
              : "Provider halal result"),
          distance: nearbyDistanceKm(
            latitude,
            longitude,
            Number(place.latitude),
            Number(place.longitude),
          ),
        })),
      ),
    )
      .slice(0, 25)
      .map(({ distance, ...result }: any) => result);
  } catch (error: unknown) {
    console.warn(
      "Sparse halal enrichment failed:",
      sanitizeAIErrorMessage(error),
    );
    return results;
  }
}

type NearestAirport = {
  name: string;
  iata: string | null;
  icao: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

type AirportSearchResult = {
  id: string;
  name: string;
  iata: string | null;
  address: string;
  latitude: number;
  longitude: number;
};

function airportCodeFromText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const bracketed = value.toUpperCase().match(/\(([A-Z]{3})\)/);
    if (bracketed) return bracketed[1];
    const exact = value.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(exact)) return exact;
  }
  return null;
}

async function searchGoogleAirports(
  apiKey: string,
  query: string,
  latitude: number | null,
  longitude: number | null,
): Promise<AirportSearchResult[]> {
  const body: Record<string, unknown> = {
    textQuery: `${query} airport`,
    includedType: "airport",
    strictTypeFiltering: true,
    maxResultCount: 8,
    languageCode: "en",
  };
  if (latitude !== null && longitude !== null) {
    body.locationBias = {
      circle: {
        center: { latitude, longitude },
        radius: 50000,
      },
    };
  }
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.types",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Google airport search returned ${response.status}: ${sanitizeAIErrorMessage(payload?.error?.message || "provider error")}`,
    );
  }
  return (Array.isArray(payload?.places) ? payload.places : [])
    .map((place: any): AirportSearchResult | null => {
      const latitude = Number(place?.location?.latitude);
      const longitude = Number(place?.location?.longitude);
      const name =
        typeof place?.displayName?.text === "string"
          ? place.displayName.text.trim()
          : "";
      if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }
      return {
        id: String(place?.id || `${latitude},${longitude}`),
        name,
        iata: airportCodeFromText(name, query),
        address:
          typeof place?.formattedAddress === "string"
            ? place.formattedAddress
            : "",
        latitude,
        longitude,
      };
    })
    .filter(Boolean) as AirportSearchResult[];
}

async function searchOpenStreetMapAirports(
  query: string,
): Promise<AirportSearchResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${query} airport`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("dedupe", "1");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "NurAI-Travel/1.1",
    },
    signal: AbortSignal.timeout(8000),
  });
  const payload = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(`OpenStreetMap airport search returned ${response.status}`);
  }
  return payload
    .map((place: any): AirportSearchResult | null => {
      const latitude = Number(place?.lat);
      const longitude = Number(place?.lon);
      const rawName =
        typeof place?.name === "string" && place.name.trim()
          ? place.name.trim()
          : typeof place?.display_name === "string"
            ? place.display_name.split(",")[0].trim()
            : "";
      const kind = String(place?.type || place?.category || "").toLowerCase();
      const iata = airportCodeFromText(place?.extratags?.iata, rawName, query);
      if (
        !rawName ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        (!iata && !/airport|aerodrome|terminal/.test(kind))
      ) {
        return null;
      }
      return {
        id: `${place?.osm_type || "osm"}-${place?.osm_id || `${latitude},${longitude}`}`,
        name: rawName,
        iata,
        address:
          typeof place?.display_name === "string" ? place.display_name : "",
        latitude,
        longitude,
      };
    })
    .filter(Boolean) as AirportSearchResult[];
}

async function searchGeoapifyAirports(
  apiKey: string,
  query: string,
  latitude: number | null,
  longitude: number | null,
): Promise<AirportSearchResult[]> {
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", `${query} airport`);
  url.searchParams.set("type", "amenity");
  url.searchParams.set("category", "airport");
  url.searchParams.set("format", "geojson");
  url.searchParams.set("lang", "en");
  url.searchParams.set("limit", "8");
  url.searchParams.set("apiKey", apiKey);
  if (latitude !== null && longitude !== null) {
    url.searchParams.set("bias", `proximity:${longitude},${latitude}`);
  } else {
    url.searchParams.set("bias", "countrycode:none");
  }
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload?.features)) {
    throw new Error(
      `Geoapify airport search returned ${response.status}: ${sanitizeAIErrorMessage(payload?.message || "provider error")}`,
    );
  }
  return payload.features
    .map((feature: any): AirportSearchResult | null => {
      const props = feature?.properties || {};
      const latitude = Number(props.lat ?? feature?.geometry?.coordinates?.[1]);
      const longitude = Number(
        props.lon ?? feature?.geometry?.coordinates?.[0],
      );
      const name =
        typeof props.name === "string" && props.name.trim()
          ? props.name.trim()
          : typeof props.address_line1 === "string"
            ? props.address_line1.trim()
            : "";
      if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }
      return {
        id: String(props.place_id || `${latitude},${longitude}`),
        name,
        iata: airportCodeFromText(
          props.iata,
          props.datasource?.raw?.iata,
          name,
          query,
        ),
        address: typeof props.formatted === "string" ? props.formatted : name,
        latitude,
        longitude,
      };
    })
    .filter(Boolean) as AirportSearchResult[];
}

function buildAerodromeOverpassQuery(
  latitude: number,
  longitude: number,
  radius: number,
): string {
  return `[out:json][timeout:10];(node["aeroway"="aerodrome"](around:${radius},${latitude},${longitude});way["aeroway"="aerodrome"](around:${radius},${latitude},${longitude});relation["aeroway"="aerodrome"](around:${radius},${latitude},${longitude}););out center tags;`;
}

function parseNearestAerodrome(
  data: any,
  latitude: number,
  longitude: number,
): NearestAirport | null {
  const elements = Array.isArray(data?.elements) ? data.elements : [];
  let nearest: NearestAirport | null = null;

  for (const element of elements) {
    const lat = Number(element?.lat ?? element?.center?.lat);
    const lng = Number(element?.lon ?? element?.center?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const tags = element?.tags || {};
    const name = typeof tags.name === "string" ? tags.name.trim() : "";
    if (!name) continue;

    const distanceKm = nearbyDistanceKm(latitude, longitude, lat, lng);
    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = {
        name,
        iata: typeof tags.iata === "string" ? tags.iata.trim() : null,
        icao: typeof tags.icao === "string" ? tags.icao.trim() : null,
        latitude: lat,
        longitude: lng,
        distanceKm,
      };
    }
  }

  return nearest;
}

export function registerPlacesRoutes(app: Express) {
  app.get("/api/places/airport-search", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await enforcePlacesRateLimit(req, res))) return;

      const query =
        typeof req.query.query === "string" ? req.query.query.trim() : "";
      if (query.length < 2 || query.length > 80) {
        return res.status(400).json({
          error: "invalid_airport_query",
          message: "Enter an airport name, city, or three-letter code.",
        });
      }
      const latitude = parseCoordinate(req.query.lat, -90, 90);
      const longitude = parseCoordinate(req.query.lng, -180, 180);
      const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();

      if (apiKey) {
        try {
          const results = await searchGoogleAirports(
            apiKey,
            query,
            latitude,
            longitude,
          );
          if (results.length) {
            return res.json({
              results,
              provider: "google_places",
              live: true,
              trustNote:
                "Live airport places from Google. Confirm terminals and flight operations with the airport or airline.",
            });
          }
        } catch (error) {
          console.warn(
            "Google airport search fallback:",
            sanitizeAIErrorMessage(error),
          );
        }
      }

      const geoapifyKey = process.env.GEOAPIFY_API_KEY?.trim();
      if (geoapifyKey) {
        try {
          const results = await searchGeoapifyAirports(
            geoapifyKey,
            query,
            latitude,
            longitude,
          );
          if (results.length) {
            return res.json({
              results,
              provider: "geoapify",
              live: true,
              trustNote:
                "Live airport places from Geoapify. Confirm terminals and flight operations with the airport or airline.",
            });
          }
        } catch (error) {
          console.warn(
            "Geoapify airport search fallback:",
            sanitizeAIErrorMessage(error),
          );
        }
      }

      const results = await searchOpenStreetMapAirports(query);
      return res.json({
        results,
        provider: results.length ? "openstreetmap" : "none",
        live: results.length > 0,
        trustNote:
          "Live community map results. Confirm the airport and terminal with your airline before travel.",
      });
    } catch (error) {
      console.warn("Airport search error:", sanitizeAIErrorMessage(error));
      return res.status(503).json({
        error: "airport_search_unavailable",
        message: "Airport search is unavailable right now.",
      });
    }
  });

  // Detects whether the user is at/near an airport so Travel can switch its
  // "prayer rooms near you" search from a generic mosque search to the
  // airport-terminal-specific prayer_room search type. Free OpenStreetMap
  // data only — aeroway=aerodrome coverage is comprehensive and reliable
  // for this use case, so no paid provider is needed here.
  app.get("/api/places/nearest-airport", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await enforcePlacesRateLimit(req, res))) return;

      const { lat, lng } = req.query;
      const latitude = parseCoordinate(lat, -90, 90);
      const longitude = parseCoordinate(lng, -180, 180);
      if (latitude === null || longitude === null) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }

      // 10km covers the largest airport complexes (aerodrome tag centers
      // can sit a couple of km from an outlying terminal) without pulling
      // in an airport the user is merely driving past on a nearby road.
      const query = buildAerodromeOverpassQuery(latitude, longitude, 10000);
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Overpass aerodrome lookup failed: ${response.status}`);
      }
      const data = await response.json();
      const airport = parseNearestAerodrome(data, latitude, longitude);
      return res.json({ airport });
    } catch (error: unknown) {
      console.warn(
        "Nearest airport lookup error:",
        sanitizeAIErrorMessage(error),
      );
      return res.json({ airport: null });
    }
  });

  app.get("/api/places/location-search", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await enforcePlacesRateLimit(req, res))) return;

      const { query, lat, lng } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Missing query parameter" });
      }
      const cleanQuery = query.trim().slice(0, 160);
      if (cleanQuery.length < 2) {
        return res.json({ results: [], provider: "none" });
      }

      const geoapifyKey = process.env.GEOAPIFY_API_KEY;
      if (geoapifyKey) {
        const url = new URL("https://api.geoapify.com/v1/geocode/search");
        url.searchParams.set("text", cleanQuery);
        url.searchParams.set("apiKey", geoapifyKey);
        url.searchParams.set("lang", "en");
        url.searchParams.set("limit", "8");
        url.searchParams.set("type", "city");
        const latitude = parseCoordinate(lat, -90, 90);
        const longitude = parseCoordinate(lng, -180, 180);
        if (latitude !== null && longitude !== null) {
          url.searchParams.set("bias", `proximity:${longitude},${latitude}`);
        }

        const response = await fetch(url.toString());
        const data = await response.json().catch(() => ({}));
        if (response.ok && Array.isArray(data?.features)) {
          const results = dedupeLocationResults(
            data.features.map(mapGeoapifyLocationFeature).filter(Boolean),
          ).slice(0, 8);
          return res.json({ results, provider: "geoapify" });
        }

        if (isProductionRuntime()) {
          console.warn("Geoapify location search error:", {
            status: response.status,
            message: sanitizeAIErrorMessage(data?.message || "Geoapify error"),
          });
        }
      }

      const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
      if (mapboxToken) {
        const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
        url.searchParams.set("q", cleanQuery);
        url.searchParams.set("access_token", mapboxToken);
        url.searchParams.set("language", "en");
        url.searchParams.set("limit", "8");
        url.searchParams.set("autocomplete", "true");
        url.searchParams.set(
          "types",
          "country,region,district,place,locality,postcode",
        );
        if (process.env.MAPBOX_GEOCODING_PERMANENT === "true") {
          url.searchParams.set("permanent", "true");
        }
        const latitude = parseCoordinate(lat, -90, 90);
        const longitude = parseCoordinate(lng, -180, 180);
        if (latitude !== null && longitude !== null) {
          url.searchParams.set("proximity", `${longitude},${latitude}`);
        }

        const response = await fetch(url.toString());
        const data = await response.json();
        if (response.ok && Array.isArray(data?.features)) {
          const results = dedupeLocationResults(
            data.features.map(mapMapboxLocationFeature).filter(Boolean),
          ).slice(0, 8);
          return res.json({ results, provider: "mapbox" });
        }

        if (isProductionRuntime()) {
          console.warn("Mapbox location search error:", {
            status: response.status,
            message: sanitizeAIErrorMessage(data?.message || "Mapbox error"),
          });
        }
      }

      const googleKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!googleKey) {
        return res.json({
          results: [],
          provider: "local",
          fallback: true,
          message: "Global location search is not configured yet.",
        });
      }

      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("address", cleanQuery);
      url.searchParams.set("key", googleKey);
      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === "OK") {
        const results = dedupeLocationResults(
          (data.results || []).map(mapGoogleLocationResult).filter(Boolean),
        ).slice(0, 8);
        return res.json({ results, provider: "google" });
      }

      return sendProviderError(res, data, "Location search error");
    } catch (error: unknown) {
      console.error(
        "Location search API error:",
        sanitizeAIErrorMessage(error),
      );
      return res.status(500).json({
        results: [],
        message: "Failed to search locations",
      });
    }
  });

  app.get("/api/places/geocode", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await enforcePlacesRateLimit(req, res))) return;

      const { query } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Missing query parameter" });
      }
      const cleanQuery = query.trim().slice(0, 160);
      if (!cleanQuery) {
        return res.status(400).json({ error: "Missing query parameter" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return sendProviderUnconfigured(res);
      }

      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("address", cleanQuery);
      url.searchParams.set("key", apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === "OK") {
        const results = (data.results || []).slice(0, 5).map((r: any) => ({
          name: r.formatted_address,
          latitude: r.geometry?.location?.lat,
          longitude: r.geometry?.location?.lng,
        }));
        return res.json({ results });
      }

      return sendProviderError(res, data, "Geocoding error");
    } catch (error: unknown) {
      console.error("Geocode API error:", sanitizeAIErrorMessage(error));
      return res
        .status(500)
        .json({ results: [], message: "Failed to geocode" });
    }
  });

  app.get("/api/places/nearby", async (req, res) => {
    try {
      const user = await requireAuthenticatedUser(req, res);
      if (!user) return;
      if (!(await enforcePlacesRateLimit(req, res))) return;

      const { lat, lng, type, radius } = req.query;

      if (!lat || !lng || !type) {
        return res
          .status(400)
          .json({ error: "Missing required parameters: lat, lng, type" });
      }
      const latitude = parseCoordinate(lat, -90, 90);
      const longitude = parseCoordinate(lng, -180, 180);
      if (latitude === null || longitude === null) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      if (type !== "mosque" && type !== "halal" && type !== "prayer_room") {
        return res.status(400).json({ error: "Invalid place type" });
      }

      const searchRadius = Math.min(
        Math.max(Number(radius) || 10000, 500),
        25000,
      );

      // Geoapify has no category that matches a generic airport/terminal
      // multi-faith room — its rigid category filter would return an empty
      // result and short-circuit before Google/Overpass's keyword and
      // name-pattern matching ever runs. Skip straight to those for this type.
      const geoapifyKey =
        type === "prayer_room" ? null : process.env.GEOAPIFY_API_KEY;
      if (geoapifyKey) {
        try {
          const results = await fetchGeoapifyNearby(
            geoapifyKey,
            type,
            latitude,
            longitude,
            searchRadius,
          );
          return res.json({
            results,
            fallback: false,
            provider: "geoapify",
          });
        } catch (geoapifyError: unknown) {
          console.warn(
            "Geoapify places search error:",
            sanitizeAIErrorMessage(geoapifyError),
          );
        }
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        try {
          const results = await fetchOverpassNearby(
            type,
            latitude,
            longitude,
            searchRadius,
          );
          return res.json({
            results,
            fallback: true,
            provider: "openstreetmap",
            trustNote:
              "Live OpenStreetMap results. Confirm terminal and airside access with airport staff.",
          });
        } catch (fallbackError: unknown) {
          console.warn(
            "Places fallback search error:",
            sanitizeAIErrorMessage(fallbackError),
          );
          return sendProviderUnconfigured(res);
        }
      }

      let keyword = "";
      if (type === "mosque") {
        keyword = "mosque|masjid|islamic center";
      } else if (type === "halal") {
        keyword = "halal restaurant|halal food";
      } else if (type === "prayer_room") {
        keyword = "prayer room|multi faith room|reflection room|wudu";
      }

      const url = new URL(
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      );
      url.searchParams.set("location", `${latitude},${longitude}`);
      url.searchParams.set("radius", String(searchRadius));
      url.searchParams.set("keyword", keyword);
      url.searchParams.set("key", apiKey);

      if (type === "mosque") {
        url.searchParams.set("type", "mosque");
      } else if (type === "halal") {
        url.searchParams.set("type", "restaurant");
      }
      // prayer_room intentionally omits Google's `type` filter — there is no
      // Places type for a generic multi-faith room, so this stays a pure
      // keyword search.

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === "OK" || data.status === "ZERO_RESULTS") {
        const results = (data.results || []).map((place: any) => ({
          name: place.name,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          address: place.vicinity || "",
          rating: place.rating || null,
          totalRatings: place.user_ratings_total || 0,
          openNow: place.opening_hours?.open_now ?? null,
          placeId: place.place_id,
          confidenceLabel:
            type === "halal" ? "Provider halal result" : undefined,
        }));
        const enrichedResults =
          type === "halal"
            ? await enrichSparseHalalResults(
                results,
                latitude,
                longitude,
                searchRadius,
              )
            : results;
        if (!(type === "prayer_room" && enrichedResults.length === 0)) {
          return res.json({
            results: enrichedResults,
            fallback: false,
            provider: "google_places",
            trustNote:
              type === "prayer_room"
                ? "Live Google Places results. Confirm terminal and airside access with airport staff."
                : undefined,
            enriched:
              type === "halal" && enrichedResults.length > results.length,
          });
        }
      }

      try {
        const results = await fetchOverpassNearby(
          type,
          latitude,
          longitude,
          searchRadius,
        );
        return res.json({
          results,
          fallback: true,
          provider: "openstreetmap",
          trustNote:
            type === "prayer_room"
              ? "Live OpenStreetMap results. Confirm terminal and airside access with airport staff."
              : undefined,
          providerStatus:
            typeof data?.status === "string" ? data.status : undefined,
        });
      } catch (fallbackError: unknown) {
        console.warn(
          "Places fallback search error:",
          sanitizeAIErrorMessage(fallbackError),
        );
      }

      return sendProviderError(res, data, "Places API error");
    } catch (error: unknown) {
      console.error("Places API error:", sanitizeAIErrorMessage(error));
      return res.status(500).json({
        results: [],
        fallback: true,
        message: "Failed to fetch places",
      });
    }
  });
}
