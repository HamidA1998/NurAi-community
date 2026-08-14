import AsyncStorage from "@react-native-async-storage/async-storage";

import { ApiRequestError, apiRequest } from "@/lib/query-client";
import { syncedSetItem } from "@/lib/progress-sync";

export type TravelModePurpose =
  | "general"
  | "work"
  | "family"
  | "umrah"
  | "hajj";

export type TravelCompanionState = {
  enabled: boolean;
  destination: string;
  airportName?: string;
  hotelAddress?: string;
  emergencyContact?: string;
  groupContact?: string;
  medicationNote?: string;
  meetingPoint?: string;
  journeyReflection?: string;
  gratitudeNote?: string;
  arrivedAt?: string;
  purpose: TravelModePurpose;
  departureDate?: string;
  returnDate?: string;
  flightNumber?: string;
  flight?: TravelFlightSnapshot | null;
  bookingImports?: TravelBookingItem[];
  bookingNotes?: string;
  bookingConnectedProviders?: Record<string, boolean>;
  autoDetectEnabled?: boolean;
  homeLocation?: TravelLocationAnchor | null;
  lastDetection?: TravelDetectionResult | null;
  activeTripId?: string | null;
  savedTrips?: TravelTripRecord[];
  savedHalalPlaces?: TravelSavedHalalPlace[];
  journeyChecks?: Record<string, boolean>;
  offlinePack?: Record<string, boolean>;
  pilgrimChecks?: Record<string, boolean>;
  checklist: Record<string, boolean>;
  updatedAt: string;
};

export type TravelTripRecord = {
  id: string;
  destination: string;
  airportName?: string;
  departureDate?: string;
  returnDate?: string;
  purpose: TravelModePurpose;
  flightNumber?: string;
  flight?: TravelFlightSnapshot | null;
  bookingImports: TravelBookingItem[];
  hotelAddress?: string;
  groupContact?: string;
  meetingPoint?: string;
  arrivedAt?: string;
  checklist: Record<string, boolean>;
  journeyChecks: Record<string, boolean>;
  offlinePack: Record<string, boolean>;
  pilgrimChecks: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
};

export type TravelLocationAnchor = {
  latitude: number;
  longitude: number;
  label: string;
  updatedAt?: string;
};

export type TravelDetectionStatus =
  | "home"
  | "local"
  | "possible_travel"
  | "likely_travel"
  | "unknown";

export type TravelDetectionResult = {
  status: TravelDetectionStatus;
  distanceKm: number | null;
  title: string;
  body: string;
  islamicTravelSignal: boolean;
  checkedAt: string;
};

export type TravelFlightSnapshot = {
  provider: string;
  flightNumber: string;
  airline?: string | null;
  status?: string | null;
  departureAirport?: string | null;
  departureIata?: string | null;
  departureScheduled?: string | null;
  departureEstimated?: string | null;
  departureTimezone?: string | null;
  arrivalAirport?: string | null;
  arrivalIata?: string | null;
  arrivalScheduled?: string | null;
  arrivalEstimated?: string | null;
  arrivalTimezone?: string | null;
  terminal?: string | null;
  gate?: string | null;
  lastUpdated: string;
};

export type TravelFlightLookupResult =
  | {
      status: "success";
      flight: TravelFlightSnapshot;
      message?: string;
    }
  | {
      status: "unconfigured" | "not_found" | "error";
      message: string;
      flightNumber?: string;
    };

export type TravelSavedHalalPlace = {
  id: string;
  name: string;
  note?: string;
  checkedAt?: string;
};

export type TravelBookingType = "flight" | "hotel" | "airbnb" | "transport";

export type TravelBookingProviderStatus =
  | "available"
  | "provider_key_required"
  | "partner_required";

export type TravelBookingProvider = {
  id: string;
  name: string;
  category: "flight" | "hotel" | "stay" | "email";
  status: TravelBookingProviderStatus;
  summary: string;
};

export type TravelBookingItem = {
  id: string;
  type: TravelBookingType;
  provider: string;
  reference?: string;
  title: string;
  location?: string;
  startAt?: string;
  endAt?: string;
  notes?: string;
  source: "manual" | "confirmation_paste" | "flight_lookup";
  confidence?: number;
  detectedFields?: string[];
  createdAt: string;
};

export type TravelChecklistItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  premium?: boolean;
};

export type TravelDua = {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  when: string;
};

export type TravelSourceRef = {
  reference: string;
  note: string;
  url?: string;
};

export type TravelReadinessInsight = {
  id: string;
  title: string;
  body: string;
  tone: "ready" | "next" | "premium" | "caution";
};

export type TravelBookingSyncSummary = {
  score: number;
  title: string;
  body: string;
  missing: string[];
  nextAction: string;
  providerTruth: string;
};

export type TravelBookingImportAnalysis = {
  score: number;
  title: string;
  body: string;
  items: TravelBookingItem[];
  detectedFields: string[];
  missing: string[];
  nextAction: string;
};

export type TravelProviderSetupStatus = {
  generatedAt: string;
  providers: Record<
    string,
    {
      status:
        | "configured"
        | "key_required"
        | "partner_required"
        | "native_setup_required";
      configured: boolean;
      label: string;
      capability: string;
      requiredKeys: string[];
      setupUrl: string;
    }
  >;
  privacy: string;
};

export type TravelFlightSearchResponse = {
  provider: "amadeus";
  generatedAt: string;
  data?: unknown[];
  dictionaries?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  warnings?: unknown[];
  trustNote?: string;
};

export type TravelAirportSearchResult = {
  id: string;
  name: string;
  iata: string | null;
  address: string;
  latitude: number;
  longitude: number;
};

export type TravelAirportSearchResponse = {
  results: TravelAirportSearchResult[];
  provider: "google_places" | "geoapify" | "openstreetmap" | "none";
  live: boolean;
  trustNote: string;
};

export type TravelExternalFlightSearchLink = {
  id: string;
  label: string;
  url: string;
  note: string;
};

export type TravelExternalFlightSearchLinksResponse = {
  provider: "external_search_links";
  generatedAt: string;
  origin: string;
  destination?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  adults: string;
  links: TravelExternalFlightSearchLink[];
  trustNote: string;
  islamicTravelNote: string;
};

export type TravelExternalFlightSearchParams = {
  origin: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  adults?: number;
};

export type TravelFlightDestinationSearchParams = {
  origin: string;
  departureDate?: string;
  oneWay?: boolean;
  duration?: string | number;
  nonStop?: boolean;
  maxPrice?: string | number;
  currency?: string;
  viewBy?: "DATE" | "DESTINATION" | "DURATION" | "WEEK" | "COUNTRY";
};

export type TravelFlightDateSearchParams =
  TravelFlightDestinationSearchParams & {
    destination: string;
  };

export type TravelFlightOfferSearchParams = {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  infants?: number;
  nonStop?: boolean;
  maxPrice?: string | number;
  currencyCode?: string;
  travelClass?: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  includedAirlineCodes?: string;
  excludedAirlineCodes?: string;
  max?: number;
};

export const TRAVEL_COMPANION_STORAGE_KEY = "nurai_travel_companion_v1";

export const TRAVEL_BOOKING_PROVIDER_CATALOG: TravelBookingProvider[] = [
  {
    id: "ticket-scan",
    name: "Boarding pass / ticket scan",
    category: "email",
    status: "available",
    summary:
      "Scan or paste boarding-pass text. NurAI extracts the flight signal first, then asks the user to confirm details.",
  },
  {
    id: "confirmation-paste",
    name: "Email / confirmation paste",
    category: "email",
    status: "available",
    summary:
      "Paste booking text now. NurAI extracts likely flight, hotel, stay, reference, and date details locally.",
  },
  {
    id: "aviationstack",
    name: "Aviationstack flight status",
    category: "flight",
    status: "provider_key_required",
    summary:
      "Uses the server flight provider when the production API key is connected.",
  },
  {
    id: "amadeus",
    name: "Amadeus flights and hotels",
    category: "flight",
    status: "provider_key_required",
    summary:
      "Supports date-aware flight status and hotel APIs after credentials and compliance are in place.",
  },
  {
    id: "duffel",
    name: "Duffel flights and stays",
    category: "flight",
    status: "provider_key_required",
    summary:
      "Strong booking API option for flights and stays, but it needs approved API credentials and commercial setup.",
  },
  {
    id: "booking-connectivity",
    name: "Booking.com connectivity",
    category: "hotel",
    status: "partner_required",
    summary:
      "Designed for approved connectivity partners and property connections, not instant consumer booking sync.",
  },
  {
    id: "airbnb-partner",
    name: "Airbnb partner API",
    category: "stay",
    status: "partner_required",
    summary:
      "Airbnb API access is program/partner based. NurAI should support confirmation import until approved access exists.",
  },
];

export const TRAVEL_CHECKLIST: TravelChecklistItem[] = [
  {
    id: "prayer-plan",
    title: "Prayer plan ready",
    subtitle: "Check local salah times, qibla, and airport prayer options.",
    icon: "clock",
  },
  {
    id: "duas",
    title: "Travel duas saved",
    subtitle: "Keep leaving-home, transport, and arrival duas close.",
    icon: "heart",
  },
  {
    id: "places",
    title: "Masjids and halal places",
    subtitle:
      "Save nearby masjids and confirm halal details before travelling.",
    icon: "map-pin",
  },
  {
    id: "offline-quran",
    title: "Quran audio downloaded",
    subtitle:
      "Premium users can prepare offline audio and background playback.",
    icon: "download",
    premium: true,
  },
  {
    id: "family",
    title: "Family updated",
    subtitle: "Share your trip intention or a gentle family dua.",
    icon: "users",
  },
  {
    id: "documents",
    title: "Travel essentials checked",
    subtitle:
      "Passport, hotel address, emergency contact, medication, charger.",
    icon: "briefcase",
  },
];

export const TRAVEL_JOURNEY_STEPS: TravelChecklistItem[] = [
  {
    id: "home",
    title: "Home",
    subtitle:
      "Make intention, pray before leaving if the window is tight, and keep travel duas ready.",
    icon: "home",
  },
  {
    id: "airport",
    title: "Airport",
    subtitle:
      "Find a prayer space, keep wudu easy, and check the next prayer before boarding.",
    icon: "map-pin",
  },
  {
    id: "flight",
    title: "Flight",
    subtitle:
      "Use the prayer planner and ask NurAI for source-cautious traveller guidance if needed.",
    icon: "send",
    premium: true,
  },
  {
    id: "arrival",
    title: "Arrival",
    subtitle:
      "Refresh location, prayer times, qibla, and nearby masjid or halal options.",
    icon: "navigation",
  },
  {
    id: "hotel",
    title: "Hotel",
    subtitle:
      "Save the address, qibla direction, local masjid, and a family check-in message.",
    icon: "briefcase",
  },
];

export const OFFLINE_TRAVEL_PACK: TravelChecklistItem[] = [
  {
    id: "duas",
    title: "Travel duas",
    subtitle:
      "Keep leaving, transport, journey ease, and return duas available without searching.",
    icon: "heart",
  },
  {
    id: "quran-audio",
    title: "Quran audio",
    subtitle:
      "Premium users can prepare offline Quran/audio for long journeys.",
    icon: "download",
    premium: true,
  },
  {
    id: "qibla-fallback",
    title: "Qibla fallback",
    subtitle: "Open Qibla before travel and refresh again after arrival.",
    icon: "compass",
  },
  {
    id: "saved-places",
    title: "Saved places",
    subtitle:
      "Keep masjid, halal, hotel, and emergency notes in one journey pack.",
    icon: "map",
  },
];

export const PILGRIM_MODE_CHECKLIST: TravelChecklistItem[] = [
  {
    id: "ihram-learning",
    title: "Ihram learning",
    subtitle:
      "Review the rites with a qualified guide before relying on memory.",
    icon: "book-open",
  },
  {
    id: "miqat-plan",
    title: "Miqat plan",
    subtitle: "Know when and where your route enters ihram before departure.",
    icon: "navigation",
  },
  {
    id: "rites-timeline",
    title: "Rites timeline",
    subtitle:
      "Map tawaf, sa'i, shaving/trimming, and Hajj-day steps if relevant.",
    icon: "calendar",
  },
  {
    id: "official-health",
    title: "Official health links",
    subtitle: "Check live Nusuk and Saudi MOH guidance before travelling.",
    icon: "shield",
  },
];

export const TRAVEL_DUAS: TravelDua[] = [
  {
    id: "leaving-home",
    title: "Leaving home",
    arabic:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0647\u0650\u060C \u062A\u064E\u0648\u064E\u0643\u064E\u0651\u0644\u0652\u062A\u064F \u0639\u064E\u0644\u064E\u0649 \u0627\u0644\u0644\u0647\u0650\u060C \u0648\u064E\u0644\u064E\u0627 \u062D\u064E\u0648\u0652\u0644\u064E \u0648\u064E\u0644\u064E\u0627 \u0642\u064F\u0648\u064E\u0651\u0629\u064E \u0625\u0650\u0644\u064E\u0651\u0627 \u0628\u0650\u0627\u0644\u0644\u0647\u0650",
    transliteration:
      "Bismillah, tawakkaltu 'ala Allah, wa la hawla wa la quwwata illa billah.",
    translation:
      "In the name of Allah, I place my trust in Allah, and there is no power nor strength except with Allah.",
    when: "Before leaving your home or hotel.",
  },
  {
    id: "transport",
    title: "Riding transport",
    arabic:
      "\u0633\u064F\u0628\u0652\u062D\u064E\u0627\u0646\u064E \u0627\u0644\u064E\u0651\u0630\u0650\u064A \u0633\u064E\u062E\u064E\u0651\u0631\u064E \u0644\u064E\u0646\u064E\u0627 \u0647\u064E\u0630\u064E\u0627 \u0648\u064E\u0645\u064E\u0627 \u0643\u064F\u0646\u064E\u0651\u0627 \u0644\u064E\u0647\u064F \u0645\u064F\u0642\u0652\u0631\u0650\u0646\u0650\u064A\u0646\u064E",
    transliteration:
      "Subhana alladhi sakhkhara lana hadha wa ma kunna lahu muqrinin.",
    translation:
      "Glory is to Him Who has subjected this to us, and we could never have it by our efforts.",
    when: "When entering a car, train, plane, or other transport.",
  },
  {
    id: "journey-ease",
    title: "Ease the journey",
    arabic:
      "\u0627\u0644\u0644\u064E\u0651\u0647\u064F\u0645\u064E\u0651 \u0647\u064E\u0648\u0650\u0651\u0646\u0652 \u0639\u064E\u0644\u064E\u064A\u0652\u0646\u064E\u0627 \u0633\u064E\u0641\u064E\u0631\u064E\u0646\u064E\u0627 \u0647\u064E\u0630\u064E\u0627 \u0648\u064E\u0627\u0637\u0652\u0648\u0650 \u0639\u064E\u0646\u064E\u0651\u0627 \u0628\u064F\u0639\u0652\u062F\u064E\u0647\u064F",
    transliteration:
      "Allahumma hawwin 'alayna safarana hadha watwi 'anna bu'dah.",
    translation:
      "O Allah, make this journey easy for us and shorten its distance for us.",
    when: "At the start of a journey or before a long leg.",
  },
  {
    id: "returning",
    title: "Returning home",
    arabic:
      "\u0622\u064A\u0650\u0628\u064F\u0648\u0646\u064E \u062A\u064E\u0627\u0626\u0650\u0628\u064F\u0648\u0646\u064E \u0639\u064E\u0627\u0628\u0650\u062F\u064F\u0648\u0646\u064E \u0644\u0650\u0631\u064E\u0628\u0650\u0651\u0646\u064E\u0627 \u062D\u064E\u0627\u0645\u0650\u062F\u064F\u0648\u0646\u064E",
    transliteration: "Ayibuna ta'ibuna 'abiduna li-rabbina hamidun.",
    translation: "We return, repenting, worshipping, and praising our Lord.",
    when: "When returning from travel.",
  },
];

export const TRAVEL_SOURCE_REFS: TravelSourceRef[] = [
  {
    reference: "Quran 4:101",
    note: "Primary Quran anchor often discussed in relation to shortening prayer while travelling; juristic details vary by madhhab and circumstance.",
    url: "https://quran.com/4/101",
  },
  {
    reference: "Quran 2:197",
    note: "Primary source anchor for Hajj manners, restraint, and taqwa during pilgrimage.",
    url: "https://quran.com/2/197",
  },
  {
    reference: "Sahih Muslim 1342",
    note: "Commonly cited source for travel supplications. Users should treat fiqh details separately from dua memorisation.",
  },
];

export const ISLAMIC_TRAVEL_DETECTION_GUIDANCE = [
  {
    title: "NurAI detects travel as a planning signal",
    body: "Distance, current city, flight details, and time zone changes can help NurAI switch into Travel Mode, but this does not replace a personal fiqh ruling.",
  },
  {
    title: "Many jurists use a distance around 80-90 km",
    body: "Schools and scholars differ on exact distance, intention, city boundary, and length of stay. NurAI treats this as a cautious signal, not a fatwa.",
  },
  {
    title: "Your madhhab and circumstances matter",
    body: "Qasr, jam', fasting, and stay-length questions should be checked through your chosen school or a qualified scholar when the situation is personal.",
  },
];

export const TRAVELLER_SALAH_GUIDANCE = [
  {
    title: "Prayer times follow where you are",
    body: "When you move cities or time zones, refresh location and prayer times. NurAI should be treated as your live schedule, not yesterday's city.",
  },
  {
    title: "Shortening and combining need fiqh care",
    body: "Qasr and jam' rules vary by school, distance, intention, length of stay, and circumstance. NurAI can explain general principles, but personal rulings should be checked with qualified scholarship.",
  },
  {
    title: "Airports and stations need earlier planning",
    body: "Before long travel legs, check the next prayer window, identify a quiet prayer space, and prepare wudu before boarding where possible.",
  },
];

export function createDefaultTravelState(): TravelCompanionState {
  return {
    enabled: false,
    destination: "",
    airportName: "",
    hotelAddress: "",
    emergencyContact: "",
    groupContact: "",
    medicationNote: "",
    meetingPoint: "",
    journeyReflection: "",
    gratitudeNote: "",
    arrivedAt: "",
    purpose: "general",
    flightNumber: "",
    flight: null,
    bookingImports: [],
    bookingNotes: "",
    bookingConnectedProviders: {},
    autoDetectEnabled: true,
    homeLocation: null,
    lastDetection: null,
    activeTripId: null,
    savedTrips: [],
    savedHalalPlaces: [],
    journeyChecks: Object.fromEntries(
      TRAVEL_JOURNEY_STEPS.map((item) => [item.id, false]),
    ),
    offlinePack: Object.fromEntries(
      OFFLINE_TRAVEL_PACK.map((item) => [item.id, false]),
    ),
    pilgrimChecks: Object.fromEntries(
      PILGRIM_MODE_CHECKLIST.map((item) => [item.id, false]),
    ),
    checklist: Object.fromEntries(
      TRAVEL_CHECKLIST.map((item) => [item.id, false]),
    ),
    updatedAt: new Date().toISOString(),
  };
}

function hasTripIdentity(state: TravelCompanionState): boolean {
  return Boolean(
    state.destination.trim() ||
      state.flightNumber?.trim() ||
      state.flight ||
      state.departureDate?.trim() ||
      (state.bookingImports?.length || 0) > 0,
  );
}

export function createTravelTripId(): string {
  return `trip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function tripRecordFromState(
  state: TravelCompanionState,
  id: string,
  createdAt?: string,
): TravelTripRecord {
  const now = new Date().toISOString();
  return {
    id,
    destination: state.destination,
    airportName: state.airportName,
    departureDate: state.departureDate,
    returnDate: state.returnDate,
    purpose: state.purpose,
    flightNumber: state.flightNumber,
    flight: state.flight || null,
    bookingImports: [...(state.bookingImports || [])],
    hotelAddress: state.hotelAddress,
    groupContact: state.groupContact,
    meetingPoint: state.meetingPoint,
    arrivedAt: state.arrivedAt,
    checklist: { ...state.checklist },
    journeyChecks: { ...(state.journeyChecks || {}) },
    offlinePack: { ...(state.offlinePack || {}) },
    pilgrimChecks: { ...(state.pilgrimChecks || {}) },
    createdAt: createdAt || now,
    updatedAt: now,
  };
}

export function syncActiveTravelTrip(
  state: TravelCompanionState,
): TravelCompanionState {
  const activeTripId = state.activeTripId;
  if (!activeTripId || !hasTripIdentity(state)) return state;
  const savedTrips = [...(state.savedTrips || [])];
  const index = savedTrips.findIndex((trip) => trip.id === activeTripId);
  const record = tripRecordFromState(
    state,
    activeTripId,
    index >= 0 ? savedTrips[index].createdAt : undefined,
  );
  if (index >= 0) savedTrips[index] = record;
  else savedTrips.unshift(record);
  return { ...state, savedTrips };
}

export function activateTravelTrip(
  state: TravelCompanionState,
  trip: TravelTripRecord,
): TravelCompanionState {
  return {
    ...state,
    activeTripId: trip.id,
    destination: trip.destination,
    airportName: trip.airportName || "",
    departureDate: trip.departureDate || "",
    returnDate: trip.returnDate || "",
    purpose: trip.purpose,
    flightNumber: trip.flightNumber || "",
    flight: trip.flight || null,
    bookingImports: [...trip.bookingImports],
    hotelAddress: trip.hotelAddress || "",
    groupContact: trip.groupContact || "",
    meetingPoint: trip.meetingPoint || "",
    arrivedAt: trip.arrivedAt || "",
    checklist: { ...trip.checklist },
    journeyChecks: { ...trip.journeyChecks },
    offlinePack: { ...trip.offlinePack },
    pilgrimChecks: { ...trip.pilgrimChecks },
  };
}

function clearActiveTripFields(
  state: TravelCompanionState,
): TravelCompanionState {
  const blank = createDefaultTravelState();
  return {
    ...state,
    activeTripId: null,
    destination: "",
    airportName: "",
    departureDate: "",
    returnDate: "",
    purpose: "general",
    flightNumber: "",
    flight: null,
    bookingImports: [],
    bookingNotes: "",
    hotelAddress: "",
    groupContact: "",
    meetingPoint: "",
    arrivedAt: "",
    checklist: blank.checklist,
    journeyChecks: blank.journeyChecks,
    offlinePack: blank.offlinePack,
    pilgrimChecks: blank.pilgrimChecks,
  };
}

export function removeTravelTrip(
  state: TravelCompanionState,
  tripId: string,
): TravelCompanionState {
  const remaining = (state.savedTrips || []).filter(
    (trip) => trip.id !== tripId,
  );
  if (state.activeTripId !== tripId) {
    return { ...state, savedTrips: remaining };
  }
  const cleared = clearActiveTripFields({ ...state, savedTrips: remaining });
  return remaining[0]
    ? { ...activateTravelTrip(cleared, remaining[0]), savedTrips: remaining }
    : { ...cleared, savedTrips: [] };
}

export function removeAllTravelTrips(
  state: TravelCompanionState,
): TravelCompanionState {
  return { ...clearActiveTripFields(state), savedTrips: [] };
}

export function beginNewTravelTrip(
  state: TravelCompanionState,
): TravelCompanionState {
  const savedTrips = [...(state.savedTrips || [])];
  return {
    ...clearActiveTripFields(state),
    activeTripId: createTravelTripId(),
    savedTrips,
  };
}

export async function loadTravelCompanionState(): Promise<TravelCompanionState> {
  try {
    const raw = await AsyncStorage.getItem(TRAVEL_COMPANION_STORAGE_KEY);
    if (!raw) return createDefaultTravelState();
    let loaded: TravelCompanionState = {
      ...createDefaultTravelState(),
      ...JSON.parse(raw),
    };
    if (!(loaded.savedTrips || []).length && hasTripIdentity(loaded)) {
      const activeTripId = loaded.activeTripId || createTravelTripId();
      loaded = {
        ...loaded,
        activeTripId,
        savedTrips: [tripRecordFromState(loaded, activeTripId)],
      };
    }
    return loaded;
  } catch {
    return createDefaultTravelState();
  }
}

export async function saveTravelCompanionState(
  state: TravelCompanionState,
): Promise<void> {
  const next = syncActiveTravelTrip({
    ...state,
    updatedAt: new Date().toISOString(),
  });
  await syncedSetItem(TRAVEL_COMPANION_STORAGE_KEY, JSON.stringify(next));
}

export async function searchTravelAirports(
  query: string,
  latitude?: number,
  longitude?: number,
): Promise<TravelAirportSearchResponse> {
  const params = new URLSearchParams({ query: query.trim() });
  if (Number.isFinite(latitude)) params.set("lat", String(latitude));
  if (Number.isFinite(longitude)) params.set("lng", String(longitude));
  const response = await apiRequest(
    "GET",
    `/api/places/airport-search?${params.toString()}`,
  );
  return (await response.json()) as TravelAirportSearchResponse;
}

export function getTravelCompletionPercent(
  state: TravelCompanionState,
): number {
  const baseTotal = TRAVEL_CHECKLIST.length;
  const baseDone = TRAVEL_CHECKLIST.filter(
    (item) => state.checklist[item.id],
  ).length;
  const total = baseTotal + 3;
  const done =
    baseDone +
    (state.destination || state.flightNumber ? 1 : 0) +
    ((state.bookingImports?.length || 0) > 0 ? 1 : 0) +
    (state.enabled ? 1 : 0);
  return total ? Math.round((done / total) * 100) : 0;
}

export type TravelJourneyStage =
  | "no_trip"
  | "destination_saved"
  | "itinerary_partial"
  | "traveling"
  | "returned";

export interface TravelJourneyState {
  stage: TravelJourneyStage;
  label: string;
  description: string;
}

/**
 * One hero state, not competing signals. Before this, the screen showed a
 * binary "Travel Mode on/off" pill next to a separate "% prepared" readout
 * that could disagree with each other (mode on, 0% prepared; mode off,
 * itinerary fully saved). This derives a single stage from the same state
 * the rest of the screen already reads, per the flagged audit gap.
 */
export function deriveTravelJourneyState(
  state: TravelCompanionState,
): TravelJourneyState {
  const now = Date.now();
  const departureTime = parseDateSafe(
    state.flight?.departureScheduled || state.departureDate,
  );
  const arrivalTime = parseDateSafe(state.flight?.arrivalScheduled);
  const returnTime = parseDateSafe(state.returnDate);

  if (state.arrivedAt || (returnTime && now > returnTime)) {
    return {
      stage: "returned",
      label: "Trip complete",
      description: state.arrivedAt
        ? "Welcome back — your journey notes are saved below."
        : "This trip's return date has passed.",
    };
  }

  const likelyTraveling =
    state.lastDetection?.status === "likely_travel" ||
    Boolean(
      departureTime &&
        now >= departureTime &&
        (!returnTime || now <= returnTime),
    ) ||
    Boolean(arrivalTime && now >= arrivalTime);

  if (likelyTraveling) {
    return {
      stage: "traveling",
      label: "Traveling now",
      description: state.destination
        ? `On your way — prayer times and guidance are following ${state.destination}.`
        : "On your way — prayer times are following your current location.",
    };
  }

  const hasItinerary =
    Boolean(state.flight || state.flightNumber) ||
    (state.bookingImports?.length || 0) > 0 ||
    Boolean(state.hotelAddress);

  if (hasItinerary) {
    return {
      stage: "itinerary_partial",
      label: "Itinerary in progress",
      description:
        "Add your flight or hotel details to complete the picture before you go.",
    };
  }

  if (state.destination) {
    return {
      stage: "destination_saved",
      label: "Destination saved",
      description: `${state.destination} is saved. Add a flight or hotel next.`,
    };
  }

  return {
    stage: "no_trip",
    label: "No trip yet",
    description: "Save a destination or add a flight to start planning.",
  };
}

function parseDateSafe(value: string | undefined | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function buildTravelReadinessInsights(
  state: TravelCompanionState,
): TravelReadinessInsight[] {
  const insights: TravelReadinessInsight[] = [];
  const bookingCount = state.bookingImports?.length || 0;

  if (state.flight) {
    insights.push({
      id: "flight-live",
      title: `${state.flight.flightNumber} is live`,
      body: [
        state.flight.departureIata && state.flight.arrivalIata
          ? `${state.flight.departureIata} to ${state.flight.arrivalIata}`
          : "",
        state.flight.gate ? `Gate ${state.flight.gate}` : "",
        state.flight.status || "",
      ]
        .filter(Boolean)
        .join(" • "),
      tone: "ready",
    });
  } else if (state.flightNumber) {
    insights.push({
      id: "flight-saved",
      title: `Flight ${state.flightNumber} saved`,
      body: "Premium live lookup can add route, timing, gate, and status when the flight provider is connected.",
      tone: "premium",
    });
  } else {
    insights.push({
      id: "flight-missing",
      title: "Add a flight number",
      body: "Paste BA123, EK001, QR27, or boarding-pass text to build the journey around real timing.",
      tone: "next",
    });
  }

  if (bookingCount > 0) {
    insights.push({
      id: "booking-imported",
      title: `${bookingCount} booking ${bookingCount === 1 ? "item" : "items"} imported`,
      body: "NurAI can use pasted confirmation details for trip planning without claiming direct provider sync.",
      tone: "ready",
    });
  } else {
    insights.push({
      id: "booking-needed",
      title: "Paste the booking confirmation",
      body: "Email, hotel, Airbnb, and transport text can be organised locally while partner sync is not connected.",
      tone: "next",
    });
  }

  if (state.journeyChecks?.airport) {
    insights.push({
      id: "airport-ready",
      title: "Airport step is ready",
      body: "Keep prayer space, wudu, gate changes, and family check-in visible before boarding.",
      tone: "ready",
    });
  } else {
    insights.push({
      id: "airport-plan",
      title: "Prepare the airport step",
      body: "Check the next prayer window, locate a quiet place, and plan wudu before boarding.",
      tone: "next",
    });
  }

  if (state.arrivedAt) {
    insights.push({
      id: "arrival-done",
      title: "Arrival check-in saved",
      body: "Refresh location so prayer times, qibla, nearby masjids, and halal search use the new city.",
      tone: "ready",
    });
  } else if (state.destination || state.flight?.arrivalAirport) {
    insights.push({
      id: "arrival-reset",
      title: "Arrival reset pending",
      body: "After landing, refresh location and send a family check-in before relying on the new city schedule.",
      tone: "caution",
    });
  }

  return insights.slice(0, 4);
}

export function buildTravelBookingSyncSummary(
  state: TravelCompanionState,
): TravelBookingSyncSummary {
  const bookings = state.bookingImports || [];
  const hasImportedFlight = bookings.some(
    (booking) => booking.type === "flight",
  );
  const hasStay =
    !!state.hotelAddress ||
    bookings.some(
      (booking) => booking.type === "hotel" || booking.type === "airbnb",
    );
  const hasTransport = bookings.some((booking) => booking.type === "transport");
  const hasFlight = !!state.flight || !!state.flightNumber || hasImportedFlight;
  const hasDates =
    !!state.departureDate ||
    bookings.some((booking) => !!booking.startAt || !!booking.endAt);
  const hasDestination =
    !!state.destination ||
    !!state.flight?.arrivalAirport ||
    bookings.some((booking) => !!booking.location);
  const hasLiveFlight = !!state.flight;

  const missing = [
    !hasFlight ? "flight or route" : "",
    !hasStay ? "hotel or stay" : "",
    !hasDates ? "travel date" : "",
    !hasDestination ? "destination" : "",
  ].filter(Boolean);

  const score =
    (hasFlight ? 25 : 0) +
    (hasStay ? 20 : 0) +
    (hasDates ? 15 : 0) +
    (hasDestination ? 20 : 0) +
    (hasLiveFlight ? 20 : hasTransport ? 8 : 0);

  const providerTruth =
    "Paste import works now. Live airline lookup only runs when provider keys are configured; hotel and Airbnb account sync need approved partner access.";

  if (!bookings.length && !state.flightNumber && !state.destination) {
    return {
      score,
      title: "Start with one real trip signal",
      body: "Paste a booking email, add a flight number, or enter a destination. NurAI will organise the trip without pretending direct account sync is live.",
      missing,
      nextAction:
        "Paste your airline, hotel, Airbnb, or itinerary confirmation.",
      providerTruth,
    };
  }

  if (state.flightNumber && !state.flight) {
    return {
      score,
      title: "Flight saved, live status pending",
      body: "NurAI can plan around the flight number now. Premium live status becomes richer when the production flight provider is connected.",
      missing,
      nextAction: "Run flight lookup, then paste your stay confirmation.",
      providerTruth,
    };
  }

  if (!hasStay) {
    return {
      score,
      title: "Add your stay to complete the journey",
      body: "A hotel or Airbnb confirmation lets NurAI plan arrival prayer, qibla reset, halal places, and family check-in around the real location.",
      missing,
      nextAction: "Paste hotel, Airbnb, or address details.",
      providerTruth,
    };
  }

  if (missing.length) {
    return {
      score,
      title: "Trip sync is almost ready",
      body: "The core journey is in place. Add the missing details so prayer windows, halal planning, and family updates feel precise.",
      missing,
      nextAction: `Add ${missing[0]} next.`,
      providerTruth,
    };
  }

  return {
    score: Math.max(score, 92),
    title: "Trip sync ready",
    body: "NurAI has enough travel context to guide prayer windows, airport steps, arrival reset, halal planning, and family updates.",
    missing: [],
    nextAction: "Review your prayer-first travel plan.",
    providerTruth,
  };
}

export function buildTravelAIContext(state: TravelCompanionState) {
  const bookingSync = buildTravelBookingSyncSummary(state);
  const completed = TRAVEL_CHECKLIST.filter((item) => state.checklist[item.id])
    .map((item) => item.title)
    .join(", ");
  const pending = TRAVEL_CHECKLIST.filter((item) => !state.checklist[item.id])
    .map((item) => item.title)
    .join(", ");

  return {
    travelModeEnabled: state.enabled,
    destination: state.destination || "not set",
    purpose: state.purpose,
    departureDate: state.departureDate || "not set",
    returnDate: state.returnDate || "not set",
    flightNumber: state.flightNumber || "not set",
    flightStatus: state.flight?.status || "not set",
    flightRoute:
      state.flight?.departureIata && state.flight?.arrivalIata
        ? `${state.flight.departureIata} to ${state.flight.arrivalIata}`
        : "not set",
    travelDetection:
      state.lastDetection?.title ||
      (state.autoDetectEnabled ? "auto detection enabled" : "not set"),
    distanceFromHomeKm:
      typeof state.lastDetection?.distanceKm === "number"
        ? String(Math.round(state.lastDetection.distanceKm))
        : "not set",
    airportName: state.airportName || "not set",
    hotelAddress: state.hotelAddress || "not set",
    bookings:
      state.bookingImports
        ?.map((booking) =>
          [
            booking.type,
            booking.title,
            booking.reference ? `ref ${booking.reference}` : "",
            booking.location || "",
            booking.startAt ? `starts ${booking.startAt}` : "",
          ]
            .filter(Boolean)
            .join(" - "),
        )
        .join("; ") || "none",
    emergencyContact: state.emergencyContact || "not set",
    groupContact: state.groupContact || "not set",
    meetingPoint: state.meetingPoint || "not set",
    journeyReflection: state.journeyReflection || "not set",
    gratitudeNote: state.gratitudeNote || "not set",
    savedHalalPlaces:
      state.savedHalalPlaces
        ?.map((place) => `${place.name}${place.note ? ` (${place.note})` : ""}`)
        .join(", ") || "none",
    readinessInsights: buildTravelReadinessInsights(state)
      .map((item) => `${item.title}: ${item.body}`)
      .join("; "),
    bookingProviders: TRAVEL_BOOKING_PROVIDER_CATALOG.map(
      (provider) => `${provider.name}: ${provider.status}`,
    ).join("; "),
    bookingSyncReadiness: `${bookingSync.score}% - ${bookingSync.title}. ${bookingSync.body}`,
    bookingSyncMissing: bookingSync.missing.join(", ") || "none",
    bookingSyncNextAction: bookingSync.nextAction,
    bookingSyncProviderTruth: bookingSync.providerTruth,
    completedChecklist: completed || "none yet",
    pendingChecklist: pending || "none",
    sourceRefs: TRAVEL_SOURCE_REFS.map((source) => source.reference),
    safetyBoundary:
      "Give practical travel worship planning and source-aware education. Do not issue personal fatwa; explain that qasr/jam details vary by madhhab and circumstance.",
  };
}

export function buildTravelAIPrompt(state: TravelCompanionState): string {
  const context = buildTravelAIContext(state);
  return `Build my Muslim travel plan using this NurAI travel context only:

Destination: ${context.destination}
Purpose: ${context.purpose}
Departure: ${context.departureDate}
Return: ${context.returnDate}
Flight: ${context.flightNumber}
Flight status/route: ${context.flightStatus}; ${context.flightRoute}
Bookings: ${context.bookings}
Travel detection: ${context.travelDetection}
Distance from saved home: ${context.distanceFromHomeKm} km
Airport: ${context.airportName}
Hotel / stay: ${context.hotelAddress}
Emergency contact: ${context.emergencyContact}
Group contact: ${context.groupContact}
Meeting point: ${context.meetingPoint}
Saved halal places: ${context.savedHalalPlaces}
Travel readiness insights: ${context.readinessInsights}
Booking provider status: ${context.bookingProviders}
Booking sync readiness: ${context.bookingSyncReadiness}
Booking sync missing: ${context.bookingSyncMissing}
Booking sync next action: ${context.bookingSyncNextAction}
Booking sync provider truth: ${context.bookingSyncProviderTruth}
Journey reflection: ${context.journeyReflection}
Gratitude note: ${context.gratitudeNote}
Completed preparation: ${context.completedChecklist}
Still pending: ${context.pendingChecklist}
Relevant source anchors: ${context.sourceRefs.join(", ")}

Please give:
1. the next three things I should do before travelling,
2. how to protect salah while travelling,
3. duas to keep close,
4. halal/masjid planning advice,
5. a gentle family reminder if useful.

Keep qasr/jam guidance source-cautious and do not give a personal fatwa.`;
}

function cleanBookingLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanBookingLine(match[1]).slice(0, 120);
  }
  return undefined;
}

function inferBookingDate(text: string): string | undefined {
  const match = text.match(
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i,
  );
  return match?.[1] ? cleanBookingLine(match[1]) : undefined;
}

function inferBookingEndDate(text: string): string | undefined {
  const patterns = [
    /(?:check[-\s]?out|checkout|return|to)\s*(?:date)?\s*[:\-]?\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    /(?:until|departing)\s+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
  ];
  return firstMatch(text, patterns);
}

function inferBookingProvider(text: string, fallback: string): string {
  const knownProviders: { pattern: RegExp; label: string }[] = [
    { pattern: /\b(ryanair|fr\d{2,4})\b/i, label: "Ryanair" },
    { pattern: /\b(easyjet|ez(y|s)\d{2,4})\b/i, label: "easyJet" },
    { pattern: /\b(british airways|ba\d{2,4})\b/i, label: "British Airways" },
    { pattern: /\b(emirates|ek\d{2,4})\b/i, label: "Emirates" },
    { pattern: /\b(qatar airways|qr\d{2,4})\b/i, label: "Qatar Airways" },
    { pattern: /\b(turkish airlines|tk\d{2,4})\b/i, label: "Turkish Airlines" },
    { pattern: /\b(etihad|ey\d{2,4})\b/i, label: "Etihad Airways" },
    { pattern: /\b(saudia|sv\d{2,4})\b/i, label: "Saudia" },
    { pattern: /\b(jet2|ls\d{2,4})\b/i, label: "Jet2" },
    { pattern: /\b(wizz air|w6\d{2,4})\b/i, label: "Wizz Air" },
    { pattern: /\b(airbnb)\b/i, label: "Airbnb" },
    { pattern: /\b(booking\.com|booking com)\b/i, label: "Booking.com" },
    { pattern: /\b(expedia)\b/i, label: "Expedia" },
    { pattern: /\b(hotels\.com|hotels com)\b/i, label: "Hotels.com" },
  ];
  const known = knownProviders.find((item) => item.pattern.test(text));
  if (known) return known.label;
  const provider = firstMatch(text, [
    /\b(?:airline|carrier|operator)\s*[:\-]\s*([^\n\r]+)/i,
    /\b(?:hotel|property|host)\s*[:\-]\s*([^\n\r]+)/i,
    /\b(?:booking via|booked with|provider)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);
  return provider || fallback;
}

function inferBookingLocation(text: string): string | undefined {
  return firstMatch(text, [
    /(?:city|destination|location|arrival city)\s*[:\-]\s*([^\n\r]+)/i,
    /(?:address|hotel address|property address)\s*[:\-]\s*([^\n\r]+)/i,
    /(?:arriving in|arrival city|to)\s+([A-Z][A-Za-z .'-]{2,60})(?:\n|\r|$| on | at )/i,
  ]);
}

function detectedBookingFields(item: TravelBookingItem): string[] {
  return [
    item.type ? "type" : "",
    item.provider ? "provider" : "",
    item.reference ? "reference" : "",
    item.location ? "location" : "",
    item.startAt ? "start date" : "",
    item.endAt ? "end date" : "",
  ].filter(Boolean);
}

function scoreBookingItem(item: TravelBookingItem): number {
  const fields = detectedBookingFields(item);
  const base =
    item.type === "flight"
      ? 34
      : item.type === "hotel" || item.type === "airbnb"
        ? 30
        : 22;
  const fieldScore = Math.min(50, fields.length * 9);
  const referenceBoost = item.reference ? 8 : 0;
  const dateBoost = item.startAt ? 8 : 0;
  return Math.min(96, base + fieldScore + referenceBoost + dateBoost);
}

export function extractTravelBookingsFromText(
  input: string,
): TravelBookingItem[] {
  const text = input.trim();
  if (!text) return [];
  const lower = text.toLowerCase();
  const createdAt = new Date().toISOString();
  const flightNumber = extractFlightNumberFromText(text);
  const reference = firstMatch(text, [
    /(?:booking|reservation|confirmation|reference|ref)\s*(?:number|no\.?|#|:)?\s*([A-Z0-9-]{5,16})/i,
    /\bPNR\s*[:#]?\s*([A-Z0-9]{5,8})\b/i,
  ]);
  const hotelName = firstMatch(text, [
    /(?:hotel|property|stay|accommodation)\s*[:\-]\s*([^\n\r]+)/i,
    /(?:at|with)\s+([A-Z][A-Za-z0-9 '&.-]{3,60}(?:Hotel|Inn|Suites|Resort|Apartments|Airbnb|Lodge))/,
  ]);
  const transportName = firstMatch(text, [
    /(?:train|coach|transfer|car|taxi)\s*[:\-]\s*([^\n\r]+)/i,
    /(?:pickup|pick-up)\s*[:\-]\s*([^\n\r]+)/i,
  ]);
  const city = inferBookingLocation(text);
  const date = inferBookingDate(text);
  const endDate = inferBookingEndDate(text);
  const items: TravelBookingItem[] = [];
  const idBase = Date.now();

  if (flightNumber) {
    const item: TravelBookingItem = {
      id: `booking-flight-${idBase}`,
      type: "flight",
      provider: inferBookingProvider(text, "Flight confirmation"),
      reference,
      title: `Flight ${flightNumber}`,
      location: city,
      startAt: date,
      endAt: endDate,
      notes:
        "Extracted from pasted booking text. Confirm details before travel.",
      source: "confirmation_paste",
      createdAt,
    };
    item.detectedFields = detectedBookingFields(item);
    item.confidence = scoreBookingItem(item);
    items.push(item);
  }

  if (
    hotelName ||
    lower.includes("hotel") ||
    lower.includes("airbnb") ||
    lower.includes("reservation")
  ) {
    const item: TravelBookingItem = {
      id: `booking-stay-${idBase}`,
      type: lower.includes("airbnb") ? "airbnb" : "hotel",
      provider: lower.includes("airbnb")
        ? inferBookingProvider(text, "Airbnb confirmation")
        : inferBookingProvider(text, "Stay confirmation"),
      reference,
      title:
        hotelName || (lower.includes("airbnb") ? "Airbnb stay" : "Hotel stay"),
      location: city,
      startAt: date,
      endAt: endDate,
      notes:
        "Extracted from pasted booking text. NurAI does not connect to the provider unless approved API access is added.",
      source: "confirmation_paste",
      createdAt,
    };
    item.detectedFields = detectedBookingFields(item);
    item.confidence = scoreBookingItem(item);
    items.push(item);
  }

  if (
    transportName ||
    /\b(train|coach|transfer|taxi|pickup|pick-up)\b/i.test(text)
  ) {
    const item: TravelBookingItem = {
      id: `booking-transport-${idBase}`,
      type: "transport",
      provider: "Transport confirmation",
      reference,
      title: transportName || "Transport booking",
      location: city,
      startAt: date,
      endAt: endDate,
      notes:
        "Extracted from pasted travel text. Confirm route and timing before relying on it.",
      source: "confirmation_paste",
      createdAt,
    };
    item.detectedFields = detectedBookingFields(item);
    item.confidence = scoreBookingItem(item);
    items.push(item);
  }

  if (!items.length) {
    const item: TravelBookingItem = {
      id: `booking-note-${idBase}`,
      type: "transport",
      provider: "Manual travel note",
      reference,
      title: "Travel booking note",
      location: city,
      startAt: date,
      notes: cleanBookingLine(text).slice(0, 240),
      source: "confirmation_paste",
      createdAt,
    };
    item.detectedFields = detectedBookingFields(item);
    item.confidence = scoreBookingItem(item);
    items.push(item);
  }

  return items;
}

export function analyzeTravelBookingImport(
  input: string,
): TravelBookingImportAnalysis {
  const clean = input.trim();
  if (!clean) {
    return {
      score: 0,
      title: "Paste a real booking confirmation",
      body: "NurAI can read airline, hotel, Airbnb, train, transfer, and itinerary text once you paste it here.",
      items: [],
      detectedFields: [],
      missing: ["flight or stay", "date", "destination"],
      nextAction: "Paste the confirmation email, itinerary, or booking text.",
    };
  }

  const items = extractTravelBookingsFromText(clean);
  const detectedFields = Array.from(
    new Set(items.flatMap((item) => item.detectedFields || [])),
  );
  const hasFlight = items.some((item) => item.type === "flight");
  const hasStay = items.some(
    (item) => item.type === "hotel" || item.type === "airbnb",
  );
  const hasDate = items.some((item) => item.startAt || item.endAt);
  const hasLocation = items.some((item) => item.location);
  const hasReference = items.some((item) => item.reference);
  const missing = [
    !hasFlight && !hasStay ? "flight or stay" : "",
    !hasDate ? "date" : "",
    !hasLocation ? "destination or address" : "",
    !hasReference ? "booking reference" : "",
  ].filter(Boolean);
  const averageConfidence = items.length
    ? Math.round(
        items.reduce((sum, item) => sum + (item.confidence || 0), 0) /
          items.length,
      )
    : 0;
  const score = Math.min(
    98,
    averageConfidence +
      (hasFlight ? 8 : 0) +
      (hasStay ? 8 : 0) +
      (hasDate ? 6 : 0) +
      (hasLocation ? 6 : 0),
  );

  return {
    score,
    title:
      score >= 82
        ? "Strong booking match"
        : score >= 58
          ? "Useful trip details found"
          : "Partial travel note detected",
    body:
      score >= 82
        ? "NurAI found enough real booking detail to organise flight, stay, arrival reset, and family check-in planning."
        : "NurAI found some real trip signals. Add the missing details before relying on this for precise planning.",
    items,
    detectedFields,
    missing,
    nextAction: missing.length
      ? `Add ${missing[0]} if you have it.`
      : "Review the preview, then add it to Travel Mode.",
  };
}

export function normalizeFlightNumber(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
  const match = cleaned.match(/^([A-Z0-9]{2,3})(\d{1,4})([A-Z]?)$/);
  if (!match) return null;
  return `${match[1]}${match[2]}${match[3] || ""}`;
}

export function extractFlightNumberFromText(text: string): string | null {
  const candidates = text
    .toUpperCase()
    .replace(/FLIGHT\s*(NO\.?|NUMBER|#)?/g, " ")
    .match(/\b[A-Z0-9]{2,3}[\s-]?\d{1,4}[A-Z]?\b/g);

  if (!candidates?.length) return normalizeFlightNumber(text);
  for (const candidate of candidates) {
    const normalized = normalizeFlightNumber(candidate);
    if (normalized) return normalized;
  }
  return null;
}

export function formatFlightTime(value?: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function distanceKmBetween(
  a: Pick<TravelLocationAnchor, "latitude" | "longitude">,
  b: Pick<TravelLocationAnchor, "latitude" | "longitude">,
): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function detectIslamicTravelStatus({
  home,
  current,
}: {
  home?: TravelLocationAnchor | null;
  current?: TravelLocationAnchor | null;
}): TravelDetectionResult {
  const checkedAt = new Date().toISOString();
  if (!home || !current) {
    return {
      status: "unknown",
      distanceKm: null,
      title: "Set home location",
      body: "Save your home location so NurAI can notice when a journey may need Travel Mode.",
      islamicTravelSignal: false,
      checkedAt,
    };
  }

  const distanceKm = distanceKmBetween(home, current);
  if (distanceKm < 15) {
    return {
      status: "home",
      distanceKm,
      title: "Near home",
      body: "NurAI sees you close to your saved home area, so Travel Mode is not suggested.",
      islamicTravelSignal: false,
      checkedAt,
    };
  }
  if (distanceKm < 80) {
    return {
      status: "local",
      distanceKm,
      title: "Local journey",
      body: "This looks like a local journey. NurAI can still help with prayer times, qibla, and halal places.",
      islamicTravelSignal: false,
      checkedAt,
    };
  }
  if (distanceKm < 90) {
    return {
      status: "possible_travel",
      distanceKm,
      title: "Possible travel",
      body: "You are around the commonly cited travel-distance range. NurAI can switch on Travel Mode, but qasr and jam' details depend on your school and circumstances.",
      islamicTravelSignal: true,
      checkedAt,
    };
  }

  return {
    status: "likely_travel",
    distanceKm,
    title: "Likely travel",
    body: "You appear far from your saved home area. NurAI can enable Travel Mode for prayer timing, qibla, duas, halal places, and source-cautious worship planning.",
    islamicTravelSignal: true,
    checkedAt,
  };
}

export async function lookupFlightByNumber(
  input: string,
  scheduledDepartureDate?: string,
): Promise<TravelFlightLookupResult> {
  const flightNumber = normalizeFlightNumber(input);
  if (!flightNumber) {
    return {
      status: "error",
      message: "Enter a valid flight number, for example BA123 or EK001.",
    };
  }

  try {
    const query =
      scheduledDepartureDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(scheduledDepartureDate)
        ? `?date=${encodeURIComponent(scheduledDepartureDate)}`
        : "";
    const response = await apiRequest(
      "GET",
      `/api/travel/flight/${encodeURIComponent(flightNumber)}${query}`,
    );
    const body = (await response.json()) as {
      flight?: TravelFlightSnapshot;
      message?: string;
    };
    if (!body.flight) {
      return {
        status: "not_found",
        message: body.message || "No live flight match was found.",
        flightNumber,
      };
    }
    return {
      status: "success",
      flight: body.flight,
      message: body.message,
    };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      const code =
        typeof error.responseBody === "object" &&
        error.responseBody &&
        typeof (error.responseBody as { error?: unknown }).error === "string"
          ? String((error.responseBody as { error: string }).error)
          : error.code;
      if (code === "flight_provider_unconfigured") {
        return {
          status: "unconfigured",
          message:
            "Live flight lookup is not connected yet. The flight number is still saved for Travel Mode and NurAI planning.",
          flightNumber,
        };
      }
      if (error.status === 404) {
        return {
          status: "not_found",
          message: "No live flight match was found for that number.",
          flightNumber,
        };
      }
      return {
        status: "error",
        message: error.message || "Flight lookup is unavailable right now.",
        flightNumber,
      };
    }
    return {
      status: "error",
      message: "Flight lookup is unavailable right now.",
      flightNumber,
    };
  }
}

export async function getTravelProviderSetupStatus(): Promise<TravelProviderSetupStatus | null> {
  try {
    const response = await apiRequest("GET", "/api/travel/providers/status");
    return (await response.json()) as TravelProviderSetupStatus;
  } catch {
    return null;
  }
}

function buildTravelSearchQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

async function getAmadeusTravelSearch(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
): Promise<TravelFlightSearchResponse> {
  const response = await apiRequest(
    "GET",
    `${path}${buildTravelSearchQuery(params)}`,
  );
  return (await response.json()) as TravelFlightSearchResponse;
}

export function searchTravelFlightDestinations(
  params: TravelFlightDestinationSearchParams,
): Promise<TravelFlightSearchResponse> {
  return getAmadeusTravelSearch(
    "/api/travel/amadeus/flight-destinations",
    params,
  );
}

export function searchTravelFlightDates(
  params: TravelFlightDateSearchParams,
): Promise<TravelFlightSearchResponse> {
  return getAmadeusTravelSearch("/api/travel/amadeus/flight-dates", params);
}

export function searchTravelFlightOffers(
  params: TravelFlightOfferSearchParams,
): Promise<TravelFlightSearchResponse> {
  return getAmadeusTravelSearch("/api/travel/amadeus/flight-offers", params);
}

export async function getExternalFlightSearchLinks(
  params: TravelExternalFlightSearchParams,
): Promise<TravelExternalFlightSearchLinksResponse> {
  const response = await apiRequest(
    "GET",
    `/api/travel/flight-search-links${buildTravelSearchQuery(params)}`,
  );
  return (await response.json()) as TravelExternalFlightSearchLinksResponse;
}
