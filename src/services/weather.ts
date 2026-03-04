import { config } from "../config.ts";

/** WMO 天気コードの日本語ラベル */
const weatherLabels: Record<number, string> = {
  0: "快晴",
  1: "晴れ",
  2: "一部曇り",
  3: "曇り",
  45: "霧",
  48: "着氷性の霧",
  51: "弱い霧雨",
  53: "霧雨",
  55: "強い霧雨",
  61: "弱い雨",
  63: "雨",
  65: "強い雨",
  71: "弱い雪",
  73: "雪",
  75: "強い雪",
  80: "にわか雨",
  81: "強いにわか雨",
  95: "雷雨",
  96: "雹を伴う雷雨",
  99: "強い雹を伴う雷雨",
};

export interface WeatherData {
  location: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeed: number;
  precipitation: number;
}

/** Open-Meteo API から現在の天気情報を取得 */
export async function getWeather(
  lat: number = config.weatherLat,
  lon: number = config.weatherLon,
  locationName: string = config.weatherLocationName,
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "weather_code",
      "wind_speed_10m",
      "precipitation",
    ].join(","),
    timezone: "Asia/Tokyo",
  });

  const res = await fetch(
    `https://api.open-meteo.com/v1/jma?${params}`,
  );
  if (!res.ok) {
    throw new Error(`Open-Meteo API error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const current = data.current;
  const code = current.weather_code as number;

  return {
    location: locationName,
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    weatherCode: code,
    weatherDescription: weatherLabels[code] ?? `不明(${code})`,
    windSpeed: current.wind_speed_10m,
    precipitation: current.precipitation,
  };
}
