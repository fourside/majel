import { Hono } from "@hono/hono";
import { encodeBase64 } from "jsr:@std/encoding@^1/base64";
import { getWeather } from "../services/weather.ts";
import { getSensorData } from "../services/sensors.ts";
import { chat, clearHistory } from "../services/llm.ts";
import { transcribe } from "../services/stt.ts";
import { synthesize } from "../services/tts.ts";
import { record } from "../services/audio.ts";
import { broadcast } from "./ws.ts";

export const apiRoutes = new Hono();

/** ヘルスチェック */
apiRoutes.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

/** 天気取得 */
apiRoutes.get("/weather", async (c) => {
  const lat = c.req.query("lat");
  const lon = c.req.query("lon");
  const name = c.req.query("name");

  const weather = await getWeather(
    lat ? parseFloat(lat) : undefined,
    lon ? parseFloat(lon) : undefined,
    name ?? undefined,
  );
  return c.json(weather);
});

/** センサー現在値 + 照度履歴 */
apiRoutes.get("/sensors", (c) => {
  return c.json(getSensorData());
});

/** テキストで質問 → テキスト応答 */
apiRoutes.post("/ask", async (c) => {
  const body = await c.req.json();
  const message = body.message as string;
  if (!message) {
    return c.json({ error: "message is required" }, 400);
  }

  broadcast("status", { phase: "thinking" });
  try {
    const response = await chat(message);
    return c.json({ response });
  } catch (e) {
    console.error("ask error:", e);
    return c.json({ error: "うまく処理できませんでした。もう一度お願いします。" }, 500);
  } finally {
    broadcast("status", { phase: "done" });
  }
});

/** 音声で質問 → 音声応答の完全パイプライン */
apiRoutes.post("/voice", async (c) => {
  try {
    // 1. 録音
    broadcast("status", { phase: "listening" });
    const wavPath = await record({ duration: 5, output: "/tmp/majel_input.wav" });

    // 2. 文字起こし
    broadcast("status", { phase: "transcribing" });
    const text = await transcribe(wavPath);
    if (!text) {
      return c.json({ error: "No speech detected", transcription: "" }, 400);
    }

    // 3. LLM 応答
    broadcast("status", { phase: "thinking", transcription: text });
    const response = await chat(text);

    // 4. 音声合成（バイト列を返す）
    broadcast("status", { phase: "speaking", response });
    const audioBytes = await synthesize(response);
    const audioBase64 = encodeBase64(audioBytes);

    return c.json({
      transcription: text,
      response,
      audio: audioBase64,
    });
  } catch (e) {
    console.error("voice error:", e);
    return c.json({ error: "すみません、接続に問題があるようです。" }, 500);
  } finally {
    broadcast("status", { phase: "done" });
  }
});

/** 会話履歴クリア */
apiRoutes.post("/clear", (c) => {
  clearHistory();
  return c.json({ status: "cleared" });
});
