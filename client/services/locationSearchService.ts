import { getApiUrl } from "@/lib/query-client";
import type { UserLocation } from "@/context/LocationContext";

export type LocationSearchResult = UserLocation & {
  label: string;
  regionName?: string;
  source?: "mapbox" | "google" | "local";
};

export async function searchGlobalLocations(
  query: string,
  options: {
    latitude?: number;
    longitude?: number;
    signal?: AbortSignal;
  } = {},
): Promise<LocationSearchResult[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const url = new URL("/api/places/location-search", getApiUrl());
  url.searchParams.set("query", cleanQuery);
  if (typeof options.latitude === "number") {
    url.searchParams.set("lat", String(options.latitude));
  }
  if (typeof options.longitude === "number") {
    url.searchParams.set("lng", String(options.longitude));
  }

  const response = await fetch(url.toString(), {
    credentials: "include",
    signal: options.signal,
  });
  if (!response.ok) return [];

  const data = (await response.json()) as {
    results?: LocationSearchResult[];
  };
  return Array.isArray(data.results) ? data.results : [];
}
