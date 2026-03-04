import { Hono } from "@hono/hono";

/** 接続中の WebSocket クライアント */
const clients = new Set<WebSocket>();

/** 全クライアントにメッセージを送信 */
export function broadcast(type: string, data: unknown): void {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export const wsRoute = new Hono();

wsRoute.get("/", (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.text("Expected WebSocket", 426);
  }

  const { socket, response } = Deno.upgradeWebSocket(c.req.raw);

  socket.onopen = () => {
    clients.add(socket);
    console.log(`WebSocket connected (${clients.size} clients)`);
    broadcast("connected", { message: "MAJEL WebSocket connected" });
  };

  socket.onmessage = (event) => {
    console.log("WebSocket message:", event.data);
  };

  socket.onclose = () => {
    clients.delete(socket);
    console.log(`WebSocket disconnected (${clients.size} clients)`);
  };

  socket.onerror = (e) => {
    console.error("WebSocket error:", e);
    clients.delete(socket);
  };

  return response;
});
