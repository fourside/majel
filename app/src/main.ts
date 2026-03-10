import { assertApiKey, config } from "./config.ts";
import { app } from "./server.ts";
import { startSensorService } from "./services/sensors.ts";
import { startScheduler } from "./services/display.ts";
import { startAutoBrightness } from "./services/auto-brightness.ts";

assertApiKey();
startSensorService();
startScheduler();
startAutoBrightness();

console.log(`MAJEL server starting on port ${config.port}...`);

Deno.serve({ port: config.port }, app.fetch);
