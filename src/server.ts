import { Hono } from "@hono/hono";
import { logger } from "@hono/hono/logger";
import { serveStatic } from "@hono/hono/deno";
import { apiRoutes } from "./routes/api.ts";
import { wsRoute } from "./routes/ws.ts";

export const app = new Hono();

// ミドルウェア
app.use("*", logger());

// API ルート
app.route("/api", apiRoutes);

// WebSocket
app.route("/ws", wsRoute);

// 静的ファイル配信
app.use("/*", serveStatic({ root: "./static" }));
