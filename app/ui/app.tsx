import { useEffect, useRef } from "preact/hooks";
import { handleWsClose, handleWsMessage, handleWsOpen } from "./ws.ts";
import { Clock } from "./components/Clock.tsx";
import { Weather } from "./components/Weather.tsx";
import { Sensors } from "./components/Sensors.tsx";
import { Response } from "./components/Response.tsx";
import { Timer } from "./components/Timer.tsx";
import { Status } from "./components/Status.tsx";

const WS_RETRY_MAX = 60000;

export function App() {
  const connectedOnce = useRef(false);
  const retryDelay = useRef(1000);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: number | null = null;
    let disposed = false;

    function connect() {
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${location.host}/ws`);

      ws.onopen = () => {
        if (connectedOnce.current) {
          location.reload();
          return;
        }
        connectedOnce.current = true;
        retryDelay.current = 1000;
        handleWsOpen();
      };

      ws.onmessage = (event) => {
        handleWsMessage(JSON.parse(event.data));
      };

      ws.onclose = () => {
        handleWsClose();
        if (!disposed) {
          retryTimer = setTimeout(
            connect,
            retryDelay.current,
          ) as unknown as number;
          retryDelay.current = Math.min(retryDelay.current * 2, WS_RETRY_MAX);
        }
      };

      ws.onerror = () => ws?.close();
    }

    connect();

    return () => {
      disposed = true;
      if (retryTimer != null) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  return (
    <>
      <div class="top-bar">
        <Clock />
        <div class="weather">
          <Weather />
        </div>
      </div>
      <div class="middle">
        <Sensors />
      </div>
      <Timer />
      <Response />
      <div class="status-bar">
        <Status />
      </div>
    </>
  );
}
