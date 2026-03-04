import { config, assertApiKey } from "./config.ts";
import { app } from "./server.ts";

assertApiKey();

console.log(`MAJEL server starting on port ${config.port}...`);

Deno.serve({ port: config.port }, app.fetch);
