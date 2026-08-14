import type { UserLocation } from "@/context/LocationContext";

export type LiveWeatherSnapshot = {
  temperatureC: number;
  feelsLikeC: number;
  humidityPercent: number;
  windKmh: number;
  windGustKmh: number;
  precipitationMm: number;
  rainMm: number;
  cloudCoverPercent: number;
  weatherCode: number;
  isDay: boolean;
  conditionLabel: string;
  nextHourPrecipitationProbability: number | null;
  nextThreeHourPrecipitationProbability: number | null;
  fetchedAt: string;
  observedAt: string;
  source: "Open-Meteo";
  hourly: WeatherHourSnapshot[];
};

export type WeatherHourSnapshot = {
  time: string;
  temperatureC: number;
  precipitationProbability: number | null;
  windKmh: number;
  weatherCode: number;
  conditionLabel: string;
};

type OpenMeteoResponse = {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    is_day?: number;
    precipitation?: number;
    rain?: number;
    weather_code?: number;
    cloud_cover?: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    wind_speed_10m?: number[];
    weather_code?: number[];
  };
};

const WEATHER_TIMEOUT_MS = 8500;

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function rounded(value: number) {
  return Math.round(value);
}

export function weatherConditionLabel(code: number) {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Mostly clear";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Weather";
}

function nextPrecipitationProbability(
  data: OpenMeteoResponse,
  observedAt: string,
) {
  const times = data.hourly?.time || [];
  const probabilities = data.hourly?.precipitation_probability || [];
  if (!times.length || !probabilities.length) {
    return {
      nextHourPrecipitationProbability: null,
      nextThreeHourPrecipitationProbability: null,
    };
  }

  const matchingIndex = times.findIndex((time) => time >= observedAt);
  const currentIndex =
    matchingIndex === -1 ? Math.max(0, times.length - 1) : matchingIndex;
  const nextHours = probabilities
    .slice(currentIndex, currentIndex + 3)
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!nextHours.length) {
    return {
      nextHourPrecipitationProbability: null,
      nextThreeHourPrecipitationProbability: null,
    };
  }

  return {
    nextHourPrecipitationProbability: rounded(nextHours[0]),
    nextThreeHourPrecipitationProbability: rounded(Math.max(...nextHours)),
  };
}

function nextHourlySnapshots(
  data: OpenMeteoResponse,
  observedAt: string,
): WeatherHourSnapshot[] {
  const times = data.hourly?.time || [];
  const temperatures = data.hourly?.temperature_2m || [];
  const probabilities = data.hourly?.precipitation_probability || [];
  const winds = data.hourly?.wind_speed_10m || [];
  const codes = data.hourly?.weather_code || [];
  if (!times.length) return [];

  const matchingIndex = times.findIndex((time) => time >= observedAt);
  const currentIndex =
    matchingIndex === -1 ? Math.max(0, times.length - 1) : matchingIndex;

  return times.slice(currentIndex, currentIndex + 6).map((time, index) => {
    const sourceIndex = currentIndex + index;
    const weatherCode = rounded(numberOrZero(codes[sourceIndex]));
    return {
      time,
      temperatureC: rounded(numberOrZero(temperatures[sourceIndex])),
      precipitationProbability:
        typeof probabilities[sourceIndex] === "number" &&
        Number.isFinite(probabilities[sourceIndex])
          ? rounded(probabilities[sourceIndex])
          : null,
      windKmh: rounded(numberOrZero(winds[sourceIndex])),
      weatherCode,
      conditionLabel: weatherConditionLabel(weatherCode),
    };
  });
}

export async function fetchLiveWeather(
  location: Pick<UserLocation, "latitude" | "longitude">,
): Promise<LiveWeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "rain",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "wind_gusts_10m",
    ].join(","),
    hourly: [
      "temperature_2m",
      "precipitation_probability",
      "wind_speed_10m",
      "weather_code",
    ].join(","),
    timezone: "auto",
    forecast_days: "1",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      { signal: controller.signal },
    );
    if (!response.ok) {
      throw new Error(`Weather request failed with ${response.status}`);
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const current = data.current;
    if (!current || typeof current.temperature_2m !== "number") {
      throw new Error("Weather response missing current conditions.");
    }

    const observedAt = current.time || new Date().toISOString();
    const weatherCode = rounded(numberOrZero(current.weather_code));
    return {
      temperatureC: rounded(numberOrZero(current.temperature_2m)),
      feelsLikeC: rounded(numberOrZero(current.apparent_temperature)),
      humidityPercent: rounded(numberOrZero(current.relative_humidity_2m)),
      windKmh: rounded(numberOrZero(current.wind_speed_10m)),
      windGustKmh: rounded(numberOrZero(current.wind_gusts_10m)),
      precipitationMm: Number(numberOrZero(current.precipitation).toFixed(1)),
      rainMm: Number(numberOrZero(current.rain).toFixed(1)),
      cloudCoverPercent: rounded(numberOrZero(current.cloud_cover)),
      weatherCode,
      isDay: current.is_day !== 0,
      conditionLabel: weatherConditionLabel(weatherCode),
      ...nextPrecipitationProbability(data, observedAt),
      fetchedAt: new Date().toISOString(),
      observedAt,
      source: "Open-Meteo",
      hourly: nextHourlySnapshots(data, observedAt),
    };
  } finally {
    clearTimeout(timeout);
  }
}
