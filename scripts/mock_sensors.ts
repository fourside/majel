/**
 * モック環境センサーデータ生成スクリプト
 * 30秒ごとにランダムなセンサー値を /tmp/majel_sensors.json に書き出す。
 *
 * Usage: deno task mock:sensors
 */

const SENSORS_FILE = "/tmp/majel_sensors.json";
const INTERVAL = 30_000;

let baseTemp = 22 + Math.random() * 6; // 22〜28°C
let baseHumidity = 40 + Math.random() * 30; // 40〜70%
let basePressure = 1005 + Math.random() * 20; // 1005〜1025 hPa
let baseLight = 100 + Math.random() * 400; // 100〜500 lx

function drift(base: number, range: number, min: number, max: number): number {
  const val = base + (Math.random() - 0.5) * range;
  return Math.max(min, Math.min(max, val));
}

async function write(): Promise<void> {
  baseTemp = drift(baseTemp, 0.5, 15, 35);
  baseHumidity = drift(baseHumidity, 2, 20, 90);
  basePressure = drift(basePressure, 0.5, 990, 1040);
  baseLight = drift(baseLight, 30, 0, 2000);

  const data = {
    temperature: Math.round(baseTemp * 10) / 10,
    humidity: Math.round(baseHumidity * 10) / 10,
    pressure: Math.round(basePressure * 100) / 100,
    light: Math.round(baseLight),
    timestamp: new Date().toISOString(),
  };
  await Deno.writeTextFile(SENSORS_FILE, JSON.stringify(data));
  console.log(
    `${data.timestamp} → ${data.temperature}°C, ${data.humidity}%, ${data.pressure}hPa, ${data.light}lx`,
  );
}

console.log("Mock sensor writer started. Writing to", SENSORS_FILE);
await write();
setInterval(write, INTERVAL);
