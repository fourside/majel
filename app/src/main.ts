import { config, assertApiKey } from "./config.ts";
import { app } from "./server.ts";
import { startSensorService } from "./services/sensors.ts";
import { startScheduler } from "./services/display.ts";

assertApiKey();
startSensorService();
startScheduler();

console.log(`MAJEL server starting on port ${config.port}...`);

Deno.serve({ port: config.port }, app.fetch);
