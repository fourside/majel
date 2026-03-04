import { broadcast } from "../routes/ws.ts";

const CO2_FILE = "/tmp/majel_co2.json";
const HISTORY_SIZE = 120; // 直近120件 = 1時間分（30秒間隔）
const POLL_INTERVAL = 30_000; // 30秒

interface Co2Reading {
  co2: number;
  timestamp: string;
}

export interface Co2Data {
  value: number | null;
  timestamp: string | null;
  history: number[];
}

const history: number[] = [];
let current: Co2Reading | null = null;
let timerId: number | undefined;

async function readCo2File(): Promise<Co2Reading | null> {
  try {
    const text = await Deno.readTextFile(CO2_FILE);
    const data = JSON.parse(text) as Co2Reading;
    if (typeof data.co2 !== "number" || !data.timestamp) return null;
    return data;
  } catch {
    return null;
  }
}

async function poll(): Promise<void> {
  const reading = await readCo2File();
  if (reading) {
    current = reading;
    history.push(reading.co2);
    if (history.length > HISTORY_SIZE) {
      history.shift();
    }
    broadcast("co2", getCo2Data());
  }
}

/** 現在の CO2 データを取得 */
export function getCo2Data(): Co2Data {
  return {
    value: current?.co2 ?? null,
    timestamp: current?.timestamp ?? null,
    history,
  };
}

/** CO2 ポーリングを開始 */
export function startCo2Service(): void {
  if (timerId !== undefined) return;
  console.log("CO2 service started (polling every 30s)");
  poll(); // 初回即時実行
  timerId = setInterval(poll, POLL_INTERVAL);
}
