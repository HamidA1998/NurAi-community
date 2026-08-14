import type { Express, Request, Response } from "express";
import { sanitizeAIErrorMessage } from "./ai/errorSanitizer";
import {
  durableRateLimiter,
  getAIRateLimitSubjectFromRequest,
} from "./ai/rateLimit";
import { requirePaidAPI } from "./middleware/requirePaidAPI";

const FLIGHT_NUMBER_PATTERN = /^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/;
const AMADEUS_BASE_URL =
  process.env.AMADEUS_BASE_URL?.trim() || "https://test.api.amadeus.com";

const TRAVEL_PROVIDER_SETUP_DOC_URLS = {
  aviationstack: "https://aviationstack.com/documentation",
  amadeus:
    "https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/resources/flights/",
  duffel: "https://duffel.com/docs/api/overview",
  appleVisionKit:
    "https://developer.apple.com/documentation/visionkit/datascannerviewcontroller",
  googlePlaces:
    "https://developers.google.com/maps/documentation/places/web-service/overview",
} as const;

type FlightLookupSuccess = {
  status: "success";
  flight: ReturnType<typeof mapAviationstackFlight>;
};

type FlightLookupFailure = {
  status: "unconfigured" | "not_found" | "provider_error";
  message: string;
  providerStatus?: number;
};

type FlightLookupResult = FlightLookupSuccess | FlightLookupFailure;

type AmadeusProxyResult =
  | {
      status: "success";
      payload: any;
    }
  | {
      status: "unconfigured" | "provider_error";
      message: string;
      providerStatus?: number;
    };

async function enforceTravelRateLimit(
  req: Request,
  res: Response,
): Promise<boolean> {
  const decision = await durableRateLimiter.check(
    getAIRateLimitSubjectFromRequest(req),
    {
      namespace: "travel-flight",
      windowMs: 60_000,
      maxRequests: 20,
    },
  );
  res.setHeader("X-RateLimit-Limit", String(decision.limit));
  res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
  if (decision.allowed) return true;
  res.setHeader("Retry-After", String(Math.ceil(decision.retryAfterMs / 1000)));
  res.status(429).json({
    error: "too_many_flight_lookups",
    message: "Too many flight lookups. Please wait a moment and try again.",
  });
  return false;
}

async function enforceTravelSearchRateLimit(
  req: Request,
  res: Response,
): Promise<boolean> {
  const decision = await durableRateLimiter.check(
    getAIRateLimitSubjectFromRequest(req),
    {
      namespace: "travel-flight-search",
      windowMs: 60_000,
      maxRequests: 12,
    },
  );
  res.setHeader("X-RateLimit-Limit", String(decision.limit));
  res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
  if (decision.allowed) return true;
  res.setHeader("Retry-After", String(Math.ceil(decision.retryAfterMs / 1000)));
  res.status(429).json({
    error: "too_many_flight_searches",
    message: "Too many flight searches. Please wait a moment and try again.",
  });
  return false;
}

function normalizeFlightNumber(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const normalized = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
  return FLIGHT_NUMBER_PATTERN.test(normalized) ? normalized : null;
}

function parseFlightNumberParts(input: string) {
  const normalized = normalizeFlightNumber(input);
  const match = normalized?.match(/^([A-Z0-9]{2,3})(\d{1,4})([A-Z]?)$/);
  if (!normalized || !match) return null;
  return {
    normalized,
    carrierCode: match[1],
    flightNumber: match[2],
    operationalSuffix: match[3] || null,
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isoDateOrToday(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return new Date().toISOString().slice(0, 10);
}

function normalizeIataCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase().trim();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function normalizeDateOrDateRange(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim();
  return /^\d{4}-\d{2}-\d{2}(,\d{4}-\d{2}-\d{2})?$/.test(normalized)
    ? normalized
    : null;
}

function normalizeBooleanQuery(value: unknown): string | null {
  if (value === true || value === "true") return "true";
  if (value === false || value === "false") return "false";
  return null;
}

function normalizeDuration(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return /^\d{1,2}(,\d{1,2})?$/.test(normalized) ? normalized : null;
}

function normalizePositiveInteger(
  value: unknown,
  { min = 1, max = 250 } = {},
): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return String(parsed);
}

function normalizePrice(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return normalized;
}

function normalizeCurrency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase().trim();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function normalizeViewBy(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase().trim();
  return ["DATE", "DESTINATION", "DURATION", "WEEK", "COUNTRY"].includes(
    normalized,
  )
    ? normalized
    : null;
}

function normalizeTravelClass(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase().trim();
  return ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"].includes(
    normalized,
  )
    ? normalized
    : null;
}

function normalizeAirlineCodes(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9]{2}(,[A-Z0-9]{2}){0,8}$/.test(normalized)
    ? normalized
    : null;
}

function applyOptionalParam(
  params: URLSearchParams,
  name: string,
  value: unknown,
  normalizer: (value: unknown) => string | null,
) {
  const normalized = normalizer(value);
  if (normalized) params.set(name, normalized);
}

function buildNoProviderFlightSearchLinks({
  origin,
  destination,
  departureDate,
  returnDate,
  adults,
}: {
  origin: string;
  destination?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  adults?: string | null;
}) {
  const destinationText = destination || "anywhere";
  const dateText = departureDate
    ? returnDate
      ? `${departureDate} to ${returnDate}`
      : departureDate
    : "flexible dates";
  const travelerText = adults
    ? `${adults} adult${adults === "1" ? "" : "s"}`
    : "1 adult";
  const searchText = `flights from ${origin} to ${destinationText} ${dateText} ${travelerText}`;
  const encodedSearch = encodeURIComponent(searchText);
  const routePath = destination
    ? `${origin}-${destination}`
    : `${origin}-everywhere`;

  return [
    {
      id: "google-flights",
      label: "Google Flights",
      url: `https://www.google.com/travel/flights?q=${encodedSearch}`,
      note: "External flight search. Confirm final price and booking terms on the provider site.",
    },
    {
      id: "skyscanner",
      label: "Skyscanner",
      url: `https://www.skyscanner.com/flights/${routePath.toLowerCase()}/?adultsv2=${encodeURIComponent(adults || "1")}`,
      note: "External comparison search. Skyscanner sends users to airline or travel partners to book.",
    },
    {
      id: "kayak",
      label: "KAYAK",
      url: `https://www.kayak.com/flights/${routePath}${departureDate ? `/${departureDate}` : ""}${returnDate ? `/${returnDate}` : ""}`,
      note: "External comparison search. Confirm live fare and baggage terms before purchase.",
    },
  ];
}

function pickFlightRows(payload: any): any[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function mapAviationstackFlight(row: any, requestedFlightNumber: string) {
  const flightNumber =
    stringOrNull(row?.flight?.iata) ||
    stringOrNull(row?.flight?.icao) ||
    requestedFlightNumber;

  return {
    provider: "aviationstack",
    flightNumber,
    airline: stringOrNull(row?.airline?.name),
    status: stringOrNull(row?.flight_status),
    departureAirport: stringOrNull(row?.departure?.airport),
    departureIata: stringOrNull(row?.departure?.iata),
    departureScheduled: stringOrNull(row?.departure?.scheduled),
    departureEstimated: stringOrNull(row?.departure?.estimated),
    departureTimezone: stringOrNull(row?.departure?.timezone),
    arrivalAirport: stringOrNull(row?.arrival?.airport),
    arrivalIata: stringOrNull(row?.arrival?.iata),
    arrivalScheduled: stringOrNull(row?.arrival?.scheduled),
    arrivalEstimated: stringOrNull(row?.arrival?.estimated),
    arrivalTimezone: stringOrNull(row?.arrival?.timezone),
    terminal:
      stringOrNull(row?.departure?.terminal) ||
      stringOrNull(row?.arrival?.terminal),
    gate:
      stringOrNull(row?.departure?.gate) || stringOrNull(row?.arrival?.gate),
    lastUpdated: new Date().toISOString(),
  };
}

async function lookupAviationstackFlight(flightNumber: string) {
  const accessKey = process.env.AVIATIONSTACK_API_KEY?.trim();
  if (!accessKey) {
    return {
      status: "unconfigured" as const,
      message: "Live flight lookup is not configured yet.",
    };
  }

  const url = new URL("https://api.aviationstack.com/v1/flights");
  url.searchParams.set("access_key", accessKey);
  url.searchParams.set("flight_iata", flightNumber);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.error) {
    const providerMessage =
      stringOrNull(payload?.error?.message) ||
      stringOrNull(payload?.message) ||
      `Aviationstack returned ${response.status}`;
    return {
      status: "provider_error" as const,
      message: sanitizeAIErrorMessage(providerMessage),
      providerStatus: response.status,
    };
  }

  const [row] = pickFlightRows(payload);
  if (!row) {
    return {
      status: "not_found" as const,
      message: "No live flight match was found for that flight number.",
    };
  }

  return {
    status: "success" as const,
    flight: mapAviationstackFlight(row, flightNumber),
  };
}

async function getAmadeusAccessToken() {
  const clientId = process.env.AMADEUS_CLIENT_ID?.trim();
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const response = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.access_token !== "string") {
    throw new Error(
      sanitizeAIErrorMessage(
        payload?.error_description ||
          payload?.error ||
          `Amadeus auth returned ${response.status}`,
      ),
    );
  }
  return payload.access_token as string;
}

async function callAmadeusGet(
  path: string,
  params: URLSearchParams,
): Promise<AmadeusProxyResult> {
  const token = await getAmadeusAccessToken();
  if (!token) {
    return {
      status: "unconfigured",
      message: "Amadeus travel search is not configured yet.",
    };
  }

  const url = new URL(`${AMADEUS_BASE_URL}${path}`);
  params.forEach((value, key) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.errors) {
    const providerMessage =
      stringOrNull(payload?.errors?.[0]?.detail) ||
      stringOrNull(payload?.errors?.[0]?.title) ||
      stringOrNull(payload?.error_description) ||
      stringOrNull(payload?.error) ||
      `Amadeus returned ${response.status}`;
    return {
      status: "provider_error",
      message: sanitizeAIErrorMessage(providerMessage),
      providerStatus: response.status,
    };
  }

  return {
    status: "success",
    payload,
  };
}

function pickAmadeusFlightPoints(row: any) {
  const points = Array.isArray(row?.flightPoints) ? row.flightPoints : [];
  return {
    departure: points[0] || {},
    arrival: points.length > 1 ? points[points.length - 1] : {},
  };
}

function pickAmadeusTime(point: any) {
  const timings = Array.isArray(point?.departure?.timings)
    ? point.departure.timings
    : Array.isArray(point?.arrival?.timings)
      ? point.arrival.timings
      : [];
  const scheduled =
    timings.find(
      (time: any) => time?.qualifier === "STD" || time?.qualifier === "STA",
    ) ||
    timings[0] ||
    {};
  const estimated =
    timings.find(
      (time: any) => time?.qualifier === "ETD" || time?.qualifier === "ETA",
    ) || {};
  return {
    scheduled: stringOrNull(scheduled?.value),
    estimated: stringOrNull(estimated?.value),
  };
}

function pickAmadeusIata(point: any) {
  return (
    stringOrNull(point?.iataCode) ||
    stringOrNull(point?.departure?.iataCode) ||
    stringOrNull(point?.arrival?.iataCode)
  );
}

function mapAmadeusFlight(row: any, requestedFlightNumber: string) {
  const flightDesignator = row?.flightDesignator || {};
  const carrierCode = stringOrNull(flightDesignator?.carrierCode);
  const numericFlightNumber = stringOrNull(flightDesignator?.flightNumber);
  const operationalSuffix = stringOrNull(flightDesignator?.operationalSuffix);
  const flightNumber =
    carrierCode && numericFlightNumber
      ? `${carrierCode}${numericFlightNumber}${operationalSuffix || ""}`
      : requestedFlightNumber;
  const { departure, arrival } = pickAmadeusFlightPoints(row);
  const departureTime = pickAmadeusTime(departure);
  const arrivalTime = pickAmadeusTime(arrival);
  const departureIata = pickAmadeusIata(departure);
  const arrivalIata = pickAmadeusIata(arrival);

  return {
    provider: "amadeus",
    flightNumber,
    airline: carrierCode,
    status:
      stringOrNull(row?.flightStatus) ||
      stringOrNull(row?.flightStatusCode) ||
      stringOrNull(row?.serviceType),
    departureAirport: departureIata,
    departureIata,
    departureScheduled: departureTime.scheduled,
    departureEstimated: departureTime.estimated,
    departureTimezone: stringOrNull(departure?.timezone),
    arrivalAirport: arrivalIata,
    arrivalIata,
    arrivalScheduled: arrivalTime.scheduled,
    arrivalEstimated: arrivalTime.estimated,
    arrivalTimezone: stringOrNull(arrival?.timezone),
    terminal:
      stringOrNull(departure?.departure?.terminal?.code) ||
      stringOrNull(arrival?.arrival?.terminal?.code),
    gate:
      stringOrNull(departure?.departure?.gate?.mainGate) ||
      stringOrNull(arrival?.arrival?.gate?.mainGate),
    lastUpdated: new Date().toISOString(),
  };
}

async function lookupAmadeusFlight(
  flightNumber: string,
  scheduledDepartureDate: string,
): Promise<FlightLookupResult> {
  const parts = parseFlightNumberParts(flightNumber);
  if (!parts) {
    return {
      status: "not_found",
      message: "No live flight match was found for that flight number.",
    };
  }

  const token = await getAmadeusAccessToken();
  if (!token) {
    return {
      status: "unconfigured",
      message: "Amadeus flight lookup is not configured yet.",
    };
  }

  const url = new URL(`${AMADEUS_BASE_URL}/v2/schedule/flights`);
  url.searchParams.set("carrierCode", parts.carrierCode);
  url.searchParams.set("flightNumber", parts.flightNumber);
  url.searchParams.set("scheduledDepartureDate", scheduledDepartureDate);
  if (parts.operationalSuffix) {
    url.searchParams.set("operationalSuffix", parts.operationalSuffix);
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.errors) {
    const providerMessage =
      stringOrNull(payload?.errors?.[0]?.detail) ||
      stringOrNull(payload?.errors?.[0]?.title) ||
      `Amadeus returned ${response.status}`;
    return {
      status: "provider_error",
      message: sanitizeAIErrorMessage(providerMessage),
      providerStatus: response.status,
    };
  }

  const [row] = pickFlightRows(payload);
  if (!row) {
    return {
      status: "not_found",
      message: "No live flight match was found for that date.",
    };
  }
  return {
    status: "success",
    flight: mapAmadeusFlight(row, flightNumber),
  };
}

async function lookupFlightWithAvailableProvider(
  flightNumber: string,
  scheduledDepartureDate: string,
): Promise<FlightLookupResult> {
  if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
    const amadeusResult = await lookupAmadeusFlight(
      flightNumber,
      scheduledDepartureDate,
    );
    if (
      amadeusResult.status === "success" ||
      amadeusResult.status === "not_found"
    ) {
      return amadeusResult;
    }
    console.warn("Amadeus flight provider fallback:", {
      flightNumber,
      providerStatus: amadeusResult.providerStatus,
      message: amadeusResult.message,
    });
  }

  return lookupAviationstackFlight(flightNumber);
}

function hasEnv(name: string): boolean {
  return !!process.env[name]?.trim();
}

function getTravelProviderSetupStatus() {
  const amadeusConfigured =
    hasEnv("AMADEUS_CLIENT_ID") && hasEnv("AMADEUS_CLIENT_SECRET");

  return {
    generatedAt: new Date().toISOString(),
    providers: {
      ticketScan: {
        status: "native_setup_required",
        configured: false,
        label: "Boarding pass / ticket scanner",
        capability:
          "Use Apple VisionKit OCR on iOS, then pass extracted text into NurAI's local booking parser.",
        requiredKeys: [],
        setupUrl: TRAVEL_PROVIDER_SETUP_DOC_URLS.appleVisionKit,
      },
      aviationstack: {
        status: hasEnv("AVIATIONSTACK_API_KEY") ? "configured" : "key_required",
        configured: hasEnv("AVIATIONSTACK_API_KEY"),
        label: "Aviationstack flight status",
        capability: "Flight-number status, route, gate, terminal, and timing.",
        requiredKeys: ["AVIATIONSTACK_API_KEY"],
        setupUrl: TRAVEL_PROVIDER_SETUP_DOC_URLS.aviationstack,
      },
      amadeus: {
        status: amadeusConfigured ? "configured" : "key_required",
        configured: amadeusConfigured,
        label: "Amadeus flight search and schedule",
        capability:
          "Date-aware flight schedule/status and future flight search/hotel expansion.",
        requiredKeys: [
          "AMADEUS_CLIENT_ID",
          "AMADEUS_CLIENT_SECRET",
          "AMADEUS_BASE_URL",
        ],
        setupUrl: TRAVEL_PROVIDER_SETUP_DOC_URLS.amadeus,
      },
      duffel: {
        status: hasEnv("DUFFEL_API_KEY") ? "configured" : "partner_required",
        configured: hasEnv("DUFFEL_API_KEY"),
        label: "Duffel flight offers",
        capability:
          "Flight offer search/booking after approved commercial setup.",
        requiredKeys: ["DUFFEL_API_KEY"],
        setupUrl: TRAVEL_PROVIDER_SETUP_DOC_URLS.duffel,
      },
      places: {
        status: hasEnv("GOOGLE_PLACES_API_KEY") ? "configured" : "key_required",
        configured: hasEnv("GOOGLE_PLACES_API_KEY"),
        label: "Places and mosque discovery",
        capability:
          "Nearby mosques, halal places, and airport prayer-room search candidates with verification labels.",
        requiredKeys: [
          "GOOGLE_PLACES_API_KEY",
          "GEOAPIFY_API_KEY",
          "MAPBOX_ACCESS_TOKEN",
        ],
        setupUrl: TRAVEL_PROVIDER_SETUP_DOC_URLS.googlePlaces,
      },
    },
    privacy:
      "No provider keys are exposed to the app. This route reports configuration status only.",
  };
}

function sendAmadeusResult(
  res: Response,
  result: AmadeusProxyResult,
  errorPrefix: string,
) {
  if (result.status === "unconfigured") {
    res.status(503).json({
      error: "amadeus_provider_unconfigured",
      message:
        "Amadeus travel search is not connected yet. Add server-side Amadeus credentials first.",
    });
    return;
  }
  if (result.status === "provider_error") {
    console.warn(`${errorPrefix} Amadeus provider error:`, {
      providerStatus: result.providerStatus,
      message: result.message,
    });
    res.status(502).json({
      error: "amadeus_provider_error",
      message: "Amadeus travel search is unavailable right now.",
    });
    return;
  }
  if (result.status !== "success") return;

  res.json({
    provider: "amadeus",
    generatedAt: new Date().toISOString(),
    ...result.payload,
    trustNote:
      "Amadeus inspiration and cheapest-date APIs can use cached prices. Confirm live availability with Flight Offers Search before booking.",
  });
}

export function registerTravelRoutes(app: Express) {
  app.get("/api/travel/providers/status", (_req, res) => {
    res.json(getTravelProviderSetupStatus());
  });

  app.get("/api/travel/flight-search-links", async (req, res) => {
    try {
      if (!(await enforceTravelSearchRateLimit(req, res))) return;

      const origin = normalizeIataCode(req.query.origin);
      const destination = normalizeIataCode(req.query.destination);
      if (!origin) {
        res.status(400).json({
          error: "invalid_origin",
          message:
            "Enter a valid three-letter origin IATA code, for example LHR.",
        });
        return;
      }

      const departureDate = normalizeDate(req.query.departureDate);
      const returnDate = normalizeDate(req.query.returnDate);
      const adults =
        normalizePositiveInteger(req.query.adults, { min: 1, max: 9 }) || "1";

      res.json({
        provider: "external_search_links",
        generatedAt: new Date().toISOString(),
        origin,
        destination,
        departureDate,
        returnDate,
        adults,
        links: buildNoProviderFlightSearchLinks({
          origin,
          destination,
          departureDate,
          returnDate,
          adults,
        }),
        trustNote:
          "No flight API key is configured. NurAI is giving external search links, not live fare or availability data.",
        islamicTravelNote:
          "NurAI can still use the route, dates, weather, qibla, prayer times, travel duas, and saved booking text to build a prayer-first travel plan.",
      });
    } catch (error) {
      console.error(
        "No-provider flight search links failed:",
        sanitizeAIErrorMessage(error),
      );
      res.status(500).json({
        error: "flight_search_links_failed",
        message: "Flight search links are unavailable right now.",
      });
    }
  });

  app.get(
    "/api/travel/amadeus/flight-destinations",
    requirePaidAPI("travel_flight_lookup", "premium"),
    async (req, res) => {
      try {
        if (!(await enforceTravelSearchRateLimit(req, res))) return;

        const origin = normalizeIataCode(req.query.origin);
        if (!origin) {
          res.status(400).json({
            error: "invalid_origin",
            message:
              "Enter a valid three-letter origin IATA code, for example BOS.",
          });
          return;
        }

        const params = new URLSearchParams({ origin });
        applyOptionalParam(
          params,
          "departureDate",
          req.query.departureDate,
          normalizeDateOrDateRange,
        );
        applyOptionalParam(
          params,
          "oneWay",
          req.query.oneWay,
          normalizeBooleanQuery,
        );
        applyOptionalParam(
          params,
          "duration",
          req.query.duration,
          normalizeDuration,
        );
        applyOptionalParam(
          params,
          "nonStop",
          req.query.nonStop,
          normalizeBooleanQuery,
        );
        applyOptionalParam(
          params,
          "maxPrice",
          req.query.maxPrice,
          normalizePrice,
        );
        applyOptionalParam(
          params,
          "currency",
          req.query.currency,
          normalizeCurrency,
        );
        applyOptionalParam(params, "viewBy", req.query.viewBy, normalizeViewBy);

        const result = await callAmadeusGet(
          "/v1/shopping/flight-destinations",
          params,
        );
        sendAmadeusResult(res, result, "Flight destinations");
      } catch (error) {
        console.error(
          "Amadeus flight destinations failed:",
          sanitizeAIErrorMessage(error),
        );
        res.status(500).json({
          error: "flight_destinations_failed",
          message: "Flight destination search is unavailable right now.",
        });
      }
    },
  );

  app.get(
    "/api/travel/amadeus/flight-dates",
    requirePaidAPI("travel_flight_lookup", "premium"),
    async (req, res) => {
      try {
        if (!(await enforceTravelSearchRateLimit(req, res))) return;

        const origin = normalizeIataCode(req.query.origin);
        const destination = normalizeIataCode(req.query.destination);
        if (!origin || !destination) {
          res.status(400).json({
            error: "invalid_route",
            message:
              "Enter valid three-letter origin and destination IATA codes, for example MAD and MUC.",
          });
          return;
        }

        const params = new URLSearchParams({ origin, destination });
        applyOptionalParam(
          params,
          "departureDate",
          req.query.departureDate,
          normalizeDateOrDateRange,
        );
        applyOptionalParam(
          params,
          "oneWay",
          req.query.oneWay,
          normalizeBooleanQuery,
        );
        applyOptionalParam(
          params,
          "duration",
          req.query.duration,
          normalizeDuration,
        );
        applyOptionalParam(
          params,
          "nonStop",
          req.query.nonStop,
          normalizeBooleanQuery,
        );
        applyOptionalParam(
          params,
          "maxPrice",
          req.query.maxPrice,
          normalizePrice,
        );
        applyOptionalParam(
          params,
          "currency",
          req.query.currency,
          normalizeCurrency,
        );
        applyOptionalParam(params, "viewBy", req.query.viewBy, normalizeViewBy);

        const result = await callAmadeusGet(
          "/v1/shopping/flight-dates",
          params,
        );
        sendAmadeusResult(res, result, "Flight dates");
      } catch (error) {
        console.error(
          "Amadeus flight dates failed:",
          sanitizeAIErrorMessage(error),
        );
        res.status(500).json({
          error: "flight_dates_failed",
          message: "Flight date search is unavailable right now.",
        });
      }
    },
  );

  app.get(
    "/api/travel/amadeus/flight-offers",
    requirePaidAPI("travel_flight_lookup", "premium"),
    async (req, res) => {
      try {
        if (!(await enforceTravelSearchRateLimit(req, res))) return;

        const originLocationCode = normalizeIataCode(
          req.query.originLocationCode || req.query.origin,
        );
        const destinationLocationCode = normalizeIataCode(
          req.query.destinationLocationCode || req.query.destination,
        );
        const departureDate = normalizeDate(req.query.departureDate);
        if (!originLocationCode || !destinationLocationCode || !departureDate) {
          res.status(400).json({
            error: "invalid_flight_offer_search",
            message:
              "Enter originLocationCode, destinationLocationCode, and departureDate in YYYY-MM-DD format.",
          });
          return;
        }

        const params = new URLSearchParams({
          originLocationCode,
          destinationLocationCode,
          departureDate,
          adults:
            normalizePositiveInteger(req.query.adults, {
              min: 1,
              max: 9,
            }) || "1",
          max:
            normalizePositiveInteger(req.query.max, { min: 1, max: 50 }) ||
            "20",
        });
        applyOptionalParam(
          params,
          "returnDate",
          req.query.returnDate,
          normalizeDate,
        );
        applyOptionalParam(params, "children", req.query.children, (value) =>
          normalizePositiveInteger(value, { min: 0, max: 9 }),
        );
        applyOptionalParam(params, "infants", req.query.infants, (value) =>
          normalizePositiveInteger(value, { min: 0, max: 9 }),
        );
        applyOptionalParam(
          params,
          "nonStop",
          req.query.nonStop,
          normalizeBooleanQuery,
        );
        applyOptionalParam(
          params,
          "maxPrice",
          req.query.maxPrice,
          normalizePrice,
        );
        applyOptionalParam(
          params,
          "currencyCode",
          req.query.currencyCode || req.query.currency,
          normalizeCurrency,
        );
        applyOptionalParam(
          params,
          "travelClass",
          req.query.travelClass,
          normalizeTravelClass,
        );
        applyOptionalParam(
          params,
          "includedAirlineCodes",
          req.query.includedAirlineCodes,
          normalizeAirlineCodes,
        );
        applyOptionalParam(
          params,
          "excludedAirlineCodes",
          req.query.excludedAirlineCodes,
          normalizeAirlineCodes,
        );

        const result = await callAmadeusGet(
          "/v2/shopping/flight-offers",
          params,
        );
        sendAmadeusResult(res, result, "Flight offers");
      } catch (error) {
        console.error(
          "Amadeus flight offers failed:",
          sanitizeAIErrorMessage(error),
        );
        res.status(500).json({
          error: "flight_offers_failed",
          message: "Flight offer search is unavailable right now.",
        });
      }
    },
  );

  app.get(
    "/api/travel/flight/:flightNumber",
    requirePaidAPI("travel_flight_lookup", "premium"),
    async (req, res) => {
      try {
        if (!(await enforceTravelRateLimit(req, res))) return;

        const flightNumber = normalizeFlightNumber(req.params.flightNumber);
        if (!flightNumber) {
          res.status(400).json({
            error: "invalid_flight_number",
            message: "Enter a valid flight number, for example BA123 or EK001.",
          });
          return;
        }

        const scheduledDepartureDate = isoDateOrToday(req.query.date);
        const result = await lookupFlightWithAvailableProvider(
          flightNumber,
          scheduledDepartureDate,
        );
        if (result.status === "unconfigured") {
          res.status(503).json({
            error: "flight_provider_unconfigured",
            message:
              "Live flight lookup is not connected yet. Please try again later.",
            flightNumber,
          });
          return;
        }
        if (result.status === "provider_error") {
          console.warn("Flight provider error:", {
            flightNumber,
            providerStatus: result.providerStatus,
            message: result.message,
          });
          res.status(502).json({
            error: "flight_provider_error",
            message: "Flight lookup is unavailable right now.",
            flightNumber,
          });
          return;
        }
        if (result.status === "not_found") {
          res.status(404).json({
            error: "flight_not_found",
            message: result.message,
            flightNumber,
          });
          return;
        }

        if (result.status === "success") {
          res.json({
            flight: result.flight,
            message: "Live flight details found.",
          });
          return;
        }

        res.status(502).json({
          error: "flight_provider_error",
          message: "Flight lookup is unavailable right now.",
          flightNumber,
        });
      } catch (error) {
        console.error(
          "Travel flight lookup failed:",
          sanitizeAIErrorMessage(error),
        );
        res.status(500).json({
          error: "flight_lookup_failed",
          message: "Flight lookup is unavailable right now.",
        });
      }
    },
  );
}
