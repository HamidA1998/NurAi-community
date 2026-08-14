import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

const STORAGE_KEY = "user_location";
const ENABLE_QA_LOCATION_BYPASS =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_QA_AUTH_BYPASS === "true";

export interface UserLocation {
  latitude: number;
  longitude: number;
  cityName: string;
  countryName: string;
  calculationMethod: string;
  regionName?: string;
  source?: "gps" | "mapbox" | "google" | "local";
  accuracyMeters?: number | null;
  updatedAt?: string;
}

function locationForStorage(loc: UserLocation): UserLocation {
  return {
    ...loc,
    accuracyMeters: undefined,
    updatedAt: undefined,
  };
}

const DEFAULT_LOCATION: UserLocation = {
  latitude: 51.5074,
  longitude: -0.1278,
  cityName: "London",
  countryName: "United Kingdom",
  calculationMethod: "MoonsightingCommittee",
  source: "local",
};

const POPULAR_CITIES: UserLocation[] = [
  {
    latitude: 51.5074,
    longitude: -0.1278,
    cityName: "London",
    countryName: "United Kingdom",
    calculationMethod: "MoonsightingCommittee",
  },
  {
    latitude: 53.4808,
    longitude: -2.2426,
    cityName: "Manchester",
    countryName: "United Kingdom",
    calculationMethod: "MoonsightingCommittee",
  },
  {
    latitude: 55.9533,
    longitude: -3.1883,
    cityName: "Edinburgh",
    countryName: "United Kingdom",
    calculationMethod: "MoonsightingCommittee",
  },
  {
    latitude: 52.4862,
    longitude: -1.8904,
    cityName: "Birmingham",
    countryName: "United Kingdom",
    calculationMethod: "MoonsightingCommittee",
  },
  {
    latitude: 53.8008,
    longitude: -1.5491,
    cityName: "Leeds",
    countryName: "United Kingdom",
    calculationMethod: "MoonsightingCommittee",
  },
  {
    latitude: 51.4545,
    longitude: -2.5879,
    cityName: "Bristol",
    countryName: "United Kingdom",
    calculationMethod: "MoonsightingCommittee",
  },
  {
    latitude: 21.4225,
    longitude: 39.8262,
    cityName: "Makkah",
    countryName: "Saudi Arabia",
    calculationMethod: "UmmAlQura",
  },
  {
    latitude: 24.4539,
    longitude: 39.6142,
    cityName: "Madinah",
    countryName: "Saudi Arabia",
    calculationMethod: "UmmAlQura",
  },
  {
    latitude: 24.7136,
    longitude: 46.6753,
    cityName: "Riyadh",
    countryName: "Saudi Arabia",
    calculationMethod: "UmmAlQura",
  },
  {
    latitude: 25.2048,
    longitude: 55.2708,
    cityName: "Dubai",
    countryName: "UAE",
    calculationMethod: "Dubai",
  },
  {
    latitude: 33.8938,
    longitude: 35.5018,
    cityName: "Beirut",
    countryName: "Lebanon",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 31.9454,
    longitude: 35.9284,
    cityName: "Amman",
    countryName: "Jordan",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 30.0444,
    longitude: 31.2357,
    cityName: "Cairo",
    countryName: "Egypt",
    calculationMethod: "Egyptian",
  },
  {
    latitude: 41.0082,
    longitude: 28.9784,
    cityName: "Istanbul",
    countryName: "Turkey",
    calculationMethod: "Turkey",
  },
  {
    latitude: 33.3128,
    longitude: 44.3615,
    cityName: "Baghdad",
    countryName: "Iraq",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 35.6762,
    longitude: 51.4241,
    cityName: "Tehran",
    countryName: "Iran",
    calculationMethod: "Tehran",
  },
  {
    latitude: 31.5497,
    longitude: 74.3436,
    cityName: "Lahore",
    countryName: "Pakistan",
    calculationMethod: "Karachi",
  },
  {
    latitude: 24.8607,
    longitude: 67.0011,
    cityName: "Karachi",
    countryName: "Pakistan",
    calculationMethod: "Karachi",
  },
  {
    latitude: 33.6844,
    longitude: 73.0479,
    cityName: "Islamabad",
    countryName: "Pakistan",
    calculationMethod: "Karachi",
  },
  {
    latitude: 23.8103,
    longitude: 90.4125,
    cityName: "Dhaka",
    countryName: "Bangladesh",
    calculationMethod: "Karachi",
  },
  {
    latitude: 28.6139,
    longitude: 77.209,
    cityName: "New Delhi",
    countryName: "India",
    calculationMethod: "Karachi",
  },
  {
    latitude: 19.076,
    longitude: 72.8777,
    cityName: "Mumbai",
    countryName: "India",
    calculationMethod: "Karachi",
  },
  {
    latitude: 12.9716,
    longitude: 77.5946,
    cityName: "Bangalore",
    countryName: "India",
    calculationMethod: "Karachi",
  },
  {
    latitude: 3.139,
    longitude: 101.6869,
    cityName: "Kuala Lumpur",
    countryName: "Malaysia",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: -6.2088,
    longitude: 106.8456,
    cityName: "Jakarta",
    countryName: "Indonesia",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 40.7128,
    longitude: -74.006,
    cityName: "New York",
    countryName: "USA",
    calculationMethod: "NorthAmerica",
  },
  {
    latitude: 34.0522,
    longitude: -118.2437,
    cityName: "Los Angeles",
    countryName: "USA",
    calculationMethod: "NorthAmerica",
  },
  {
    latitude: 41.8781,
    longitude: -87.6298,
    cityName: "Chicago",
    countryName: "USA",
    calculationMethod: "NorthAmerica",
  },
  {
    latitude: 29.7604,
    longitude: -95.3698,
    cityName: "Houston",
    countryName: "USA",
    calculationMethod: "NorthAmerica",
  },
  {
    latitude: 43.6532,
    longitude: -79.3832,
    cityName: "Toronto",
    countryName: "Canada",
    calculationMethod: "NorthAmerica",
  },
  {
    latitude: 48.8566,
    longitude: 2.3522,
    cityName: "Paris",
    countryName: "France",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 52.52,
    longitude: 13.405,
    cityName: "Berlin",
    countryName: "Germany",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 59.3293,
    longitude: 18.0686,
    cityName: "Stockholm",
    countryName: "Sweden",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 52.3676,
    longitude: 4.9041,
    cityName: "Amsterdam",
    countryName: "Netherlands",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: -33.8688,
    longitude: 151.2093,
    cityName: "Sydney",
    countryName: "Australia",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: -37.8136,
    longitude: 144.9631,
    cityName: "Melbourne",
    countryName: "Australia",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 1.3521,
    longitude: 103.8198,
    cityName: "Singapore",
    countryName: "Singapore",
    calculationMethod: "Singapore",
  },
  {
    latitude: 6.5244,
    longitude: 3.3792,
    cityName: "Lagos",
    countryName: "Nigeria",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: -1.2921,
    longitude: 36.8219,
    cityName: "Nairobi",
    countryName: "Kenya",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 33.9716,
    longitude: -6.8498,
    cityName: "Rabat",
    countryName: "Morocco",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 36.7538,
    longitude: 3.0588,
    cityName: "Algiers",
    countryName: "Algeria",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 36.8065,
    longitude: 10.1815,
    cityName: "Tunis",
    countryName: "Tunisia",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 15.3694,
    longitude: 44.191,
    cityName: "Sana'a",
    countryName: "Yemen",
    calculationMethod: "UmmAlQura",
  },
  {
    latitude: 23.588,
    longitude: 58.3829,
    cityName: "Muscat",
    countryName: "Oman",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 26.2285,
    longitude: 50.586,
    cityName: "Manama",
    countryName: "Bahrain",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 25.2854,
    longitude: 51.531,
    cityName: "Doha",
    countryName: "Qatar",
    calculationMethod: "Qatar",
  },
  {
    latitude: 29.3759,
    longitude: 47.9774,
    cityName: "Kuwait City",
    countryName: "Kuwait",
    calculationMethod: "Kuwait",
  },
  {
    latitude: 32.0853,
    longitude: 34.7818,
    cityName: "Tel Aviv",
    countryName: "Palestine",
    calculationMethod: "MuslimWorldLeague",
  },
  {
    latitude: 31.7683,
    longitude: 35.2137,
    cityName: "Jerusalem",
    countryName: "Palestine",
    calculationMethod: "MuslimWorldLeague",
  },
];

export { POPULAR_CITIES };

export function guessCalculationMethod(countryName: string): string {
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
  )
    return "Karachi";
  if (
    lower.includes("united states") ||
    lower.includes("usa") ||
    lower.includes("canada")
  )
    return "NorthAmerica";
  if (lower.includes("qatar")) return "Qatar";
  if (lower.includes("kuwait")) return "Kuwait";
  if (lower.includes("singapore")) return "Singapore";
  if (lower.includes("uae") || lower.includes("emirates")) return "Dubai";
  return "MuslimWorldLeague";
}

interface LocationContextType {
  location: UserLocation;
  setLocation: (loc: UserLocation) => Promise<void>;
  isLoaded: boolean;
  detectGPSLocation: () => Promise<UserLocation | null>;
  gpsLoading: boolean;
}

const LocationContext = createContext<LocationContextType | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<UserLocation>(DEFAULT_LOCATION);
  const [isLoaded, setIsLoaded] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    if (ENABLE_QA_LOCATION_BYPASS) {
      setLocationState(DEFAULT_LOCATION);
      setIsLoaded(true);
      return;
    }

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setLocationState(JSON.parse(raw));
          } catch {}
        }
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, []);

  const setLocation = useCallback(async (loc: UserLocation) => {
    setLocationState(loc);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(locationForStorage(loc)),
    );
  }, []);

  const detectGPSLocation =
    useCallback(async (): Promise<UserLocation | null> => {
      if (ENABLE_QA_LOCATION_BYPASS) {
        await setLocation(DEFAULT_LOCATION);
        return DEFAULT_LOCATION;
      }

      setGpsLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setGpsLoading(false);
          return null;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
        });

        let cityName = "Your Location";
        let countryName = "";
        try {
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          if (geo) {
            cityName =
              geo.city || geo.subregion || geo.region || "Your Location";
            countryName = geo.country || "";
          }
        } catch {}

        const calcMethod = guessCalculationMethod(countryName);
        const detected: UserLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          cityName,
          countryName,
          calculationMethod: calcMethod,
          source: "gps",
          accuracyMeters: pos.coords.accuracy ?? null,
          updatedAt: new Date().toISOString(),
        };

        await setLocation(detected);
        setGpsLoading(false);
        return detected;
      } catch {
        setGpsLoading(false);
        return null;
      }
    }, [setLocation]);

  return (
    <LocationContext.Provider
      value={{ location, setLocation, isLoaded, detectGPSLocation, gpsLoading }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
