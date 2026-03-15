import { useEffect, useState } from "preact/hooks";
// @ts-types="../../static/lib/weather.js"
import { formatTemperature, wmoCodeToIcon } from "../../static/lib/weather.js";
import styles from "./Weather.module.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WeatherData {
  weatherCode: number;
  temperature: number;
}

export function Weather() {
  const [date, setDate] = useState(() => formatDate(new Date()));
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const timer = setInterval(
      () => setDate(formatDate(new Date())),
      60_000,
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch("/api/weather");
        if (!res.ok) throw new Error(String(res.status));
        setWeather(await res.json());
      } catch {
        setWeather(null);
      }
    }
    fetchWeather();
    const timer = setInterval(fetchWeather, 10 * 60_000);
    return () => clearInterval(timer);
  }, []);

  const iconSrc = weather ? wmoCodeToIcon(weather.weatherCode) : "";
  const iconAlt = weather ? `weather-${weather.weatherCode}` : "--";
  const temp = weather ? formatTemperature(weather.temperature) : "--°C";

  return (
    <>
      <div class={styles.date}>{date}</div>
      <div class={styles.info}>
        <img
          class={styles.icon}
          src={iconSrc}
          alt={iconAlt}
          width="48"
          height="48"
        />
        <span class={styles.temp}>{temp}</span>
      </div>
    </>
  );
}

function formatDate(d: Date): string {
  return `${d.getMonth() + 1} / ${d.getDate()} ${WEEKDAYS[d.getDay()]}`;
}
