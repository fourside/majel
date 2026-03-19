import { authorize } from "./auth.ts";
import { recordLiveStream } from "./record.ts";

const PERIODS: Record<string, number> = {
  am: 5,
  noon: 15,
};

const OUTPUT_DIR = Deno.env.get("OUTPUT_DIR") ?? "/data/news";

function main() {
  const period = Deno.args[0];
  if (!period || !(period in PERIODS)) {
    console.error(`Usage: main.ts <am|noon>`);
    Deno.exit(1);
  }

  const durationMin = PERIODS[period];
  const outputPath = `${OUTPUT_DIR}/latest_${period}.m4a`;

  return run(durationMin, outputPath);
}

async function run(durationMin: number, outputPath: string) {
  console.log("Authorizing with radiko...");
  const auth = await authorize();
  console.log(`Authorized: area=${auth.areaId}`);

  await recordLiveStream(auth, durationMin, outputPath);
}

main();
