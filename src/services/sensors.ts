import { broadcast } from "../routes/ws.ts";

const SENSORS_FILE = "/tmp/majel_sensors.json";
const HISTORY_SIZE = 120; // 直近120件 = 1時間分（30秒間隔）
const POLL_INTERVAL = 30_000; // 30秒

interface SensorReading {
  temperature: number;
  humidity: number;
  pressure: number;
  light: number;
  co2?: number; // CO2 センサー追加時に有効化
  timestamp: string;
}

export interface SensorData {
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  light: number | null;
  co2: number | null;
  timestamp: string | null;
  lightHistory: number[];
}

const lightHistory: number[] = [];
let current: SensorReading | null = null;
let timerId: number | undefined;

async function readSensorFile(): Promise<SensorReading | null> {
  try {
    const text = await Deno.readTextFile(SENSORS_FILE);
    const data = JSON.parse(text) as SensorReading;
    const required = [data.temperature, data.humidity, data.pressure, data.light];
    if (!required.every((v) => typeof v === "number") || !data.timestamp) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function poll(): Promise<void> {
  const reading = await readSensorFile();
  if (reading) {
    current = reading;
    lightHistory.push(reading.light);
    if (lightHistory.length > HISTORY_SIZE) {
      lightHistory.shift();
    }
    broadcast("sensors", getSensorData());
  }
}

/** 現在のセンサーデータを取得 */
export function getSensorData(): SensorData {
  return {
    temperature: current?.temperature ?? null,
    humidity: current?.humidity ?? null,
    pressure: current?.pressure ?? null,
    light: current?.light ?? null,
    co2: current?.co2 ?? null,
    timestamp: current?.timestamp ?? null,
    lightHistory: [...lightHistory],
  };
}

/** センサーポーリングを開始 */
export function startSensorService(): void {
  if (timerId !== undefined) return;
  console.log("Sensor service started (polling every 30s)");
  poll(); // 初回即時実行
  timerId = setInterval(poll, POLL_INTERVAL);
}
