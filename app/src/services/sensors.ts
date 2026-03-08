import { broadcast } from "../routes/ws.ts";

const SENSORS_FILE = Deno.env.get("SENSORS_FILE") ?? "/tmp/majel/majel_sensors.json";
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

/** JSON パース結果を SensorReading として検証する */
function validateReading(data: Record<string, unknown>): SensorReading | null {
  const required = [data.temperature, data.humidity, data.pressure, data.light];
  if (!required.every((v) => typeof v === "number") || !data.timestamp) {
    return null;
  }
  return data as unknown as SensorReading;
}

/** 照度履歴に値を追加し、maxSize を超えたら古い値を削除する */
function addToLightHistory(history: number[], value: number, maxSize: number): void {
  history.push(value);
  if (history.length > maxSize) {
    history.shift();
  }
}

async function readSensorFile(): Promise<SensorReading | null> {
  try {
    const text = await Deno.readTextFile(SENSORS_FILE);
    return validateReading(JSON.parse(text));
  } catch {
    return null;
  }
}

async function poll(): Promise<void> {
  const reading = await readSensorFile();
  if (reading) {
    current = reading;
    addToLightHistory(lightHistory, reading.light, HISTORY_SIZE);
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

// テスト用にexport
export { validateReading as _validateReading, addToLightHistory as _addToLightHistory };
