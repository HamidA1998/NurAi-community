import { getApiUrl } from "@/lib/query-client";

export type ServerNasheedCategory =
  | "Relaxing"
  | "Motivational"
  | "Ramadan"
  | "Kids"
  | "Dhikr"
  | "Wedding"
  | "Classical";

export interface ServerNasheedTrack {
  id: string;
  slug: string;
  title: string;
  artist: string;
  duration: string;
  category: ServerNasheedCategory;
  isFeatured?: boolean;
  audioUrl: string;
  fallbackUrl?: string | null;
  coverUrl?: string | null;
  sourceType: "owned" | "licensed";
  licenseLabel: string;
  sortOrder?: number;
  updatedAt?: string;
}

export async function fetchNasheedTracks(
  signal?: AbortSignal,
): Promise<ServerNasheedTrack[]> {
  const response = await fetch(new URL("/api/nasheeds", getApiUrl()), {
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    throw new Error("Nasheeds are temporarily unavailable.");
  }

  const data = (await response.json()) as {
    tracks?: ServerNasheedTrack[];
  };
  return Array.isArray(data.tracks) ? data.tracks : [];
}
