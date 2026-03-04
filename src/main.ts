import { config, assertApiKey } from "./config.ts";
import { app } from "./server.ts";
import { startCo2Service } from "./services/co2.ts";

assertApiKey();
startCo2Service();

console.log(`MAJEL server starting on port ${config.port}...`);

Deno.serve({ port: config.port }, app.fetch);
