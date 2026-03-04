/**
 * モック CO2 データ生成スクリプト
 * 30秒ごとにランダムな CO2 値（400〜1600ppm）を /tmp/majel_co2.json に書き出す。
 *
 * Usage: deno task mock:co2
 */

const CO2_FILE = "/tmp/majel_co2.json";
const INTERVAL = 30_000;

function randomCo2(): number {
  // 通常は 400〜800 付近、ときどき高め（換気不足シミュレーション）
  const base = 500 + Math.random() * 300; // 500〜800
  const spike = Math.random() < 0.2 ? Math.random() * 800 : 0; // 20%の確率で +0〜800
  return Math.round(base + spike);
}

async function write(): Promise<void> {
  const data = {
    co2: randomCo2(),
    timestamp: new Date().toISOString(),
  };
  await Deno.writeTextFile(CO2_FILE, JSON.stringify(data));
  console.log(`${data.timestamp} → ${data.co2} ppm`);
}

console.log("Mock CO2 writer started. Writing to", CO2_FILE);
await write();
setInterval(write, INTERVAL);
