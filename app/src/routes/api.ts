import { Hono } from "@hono/hono";
import { encodeBase64 } from "@std/encoding/base64";
import { getWeather } from "../services/weather.ts";
import { getSensorData } from "../services/sensors.ts";
import { chat, clearHistory } from "../services/llm.ts";
import { transcribe } from "../services/stt.ts";
import { synthesize } from "../services/tts.ts";
import { playResponse, record } from "../services/audio.ts";
import * as audioPlayer from "../services/audio-player.ts";
import { getBrightness, setBrightness, setPower } from "../services/display.ts";
import { suppressAutoBrightness } from "../services/auto-brightness.ts";
import { removeKanji } from "../services/kana.ts";
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

/** 音声で質問 → 音声応答の完全パイプライン
 *  - wakeword listener からの呼び出し: { wav_path: "/tmp/majel/wakeword_input.wav" }
 *  - ブラウザ / 手動: 従来どおり PowerShell 録音 */
apiRoutes.post("/voice", async (c) => {
  const pipelineStart = performance.now();
  try {
    const body = await c.req.json().catch(() => ({}));
    const externalWav = body.wav_path as string | undefined;

    let wavPath: string;
    if (externalWav) {
      wavPath = externalWav;
    } else {
      broadcast("status", { phase: "listening" });
      wavPath = await record({ duration: 5, output: "/tmp/majel_input.wav" });
    }

    // 2. 文字起こし → 漢字除去
    broadcast("status", { phase: "transcribing" });
    let t0 = performance.now();
    let text = await transcribe(wavPath);
    if (!text) {
      return c.json({ error: "No speech detected", transcription: "" }, 400);
    }
    text = removeKanji(text);
    const transcribeMs = Math.round(performance.now() - t0);

    // 3. LLM 応答
    broadcast("status", { phase: "thinking", transcription: text });
    t0 = performance.now();
    const response = await chat(text);
    const chatMs = Math.round(performance.now() - t0);

    // 4. 音声合成 → 再生
    broadcast("status", { phase: "speaking", response });
    t0 = performance.now();
    const audioBytes = await synthesize(response);
    const synthesizeMs = Math.round(performance.now() - t0);

    const totalMs = Math.round(performance.now() - pipelineStart);
    console.log(
      `[voice] transcribe: ${transcribeMs}ms, chat: ${chatMs}ms, synthesize: ${synthesizeMs}ms, total: ${totalMs}ms`,
    );

    playResponse(audioBytes);

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

/** ディスプレイ明るさ設定 */
apiRoutes.post("/display/brightness", async (c) => {
  const body = await c.req.json();
  const value = body.value;
  if (
    typeof value !== "number" || !Number.isFinite(value) || value < 0 ||
    value > 100
  ) {
    return c.json({ error: "value must be a number between 0-100" }, 400);
  }
  suppressAutoBrightness();
  await setBrightness(value);
  return c.json({ ok: true, brightness: value });
});

/** ディスプレイ電源制御 */
apiRoutes.post("/display/power", async (c) => {
  const body = await c.req.json();
  const on = body.on as boolean;
  if (typeof on !== "boolean") {
    return c.json({ error: "on must be a boolean" }, 400);
  }
  await setPower(on);
  return c.json({ ok: true, power: on });
});

/** ディスプレイ状態取得 */
apiRoutes.get("/display/status", async (c) => {
  const brightness = await getBrightness();
  return c.json({ brightness });
});

/** オーディオ再生停止（UIからのフォールバック用） */
apiRoutes.post("/audio/stop", async (c) => {
  await audioPlayer.stop();
  return c.json({ ok: true });
});

/** オーディオ再生状態取得 */
apiRoutes.get("/audio/status", (c) => {
  return c.json({
    state: audioPlayer.getPlaybackState(),
    label: audioPlayer.getPlaybackLabel(),
  });
});

/** オーディオ音量ダッキング（wakeword検出時用） */
apiRoutes.post("/audio/duck", async (c) => {
  await audioPlayer.duck();
  return c.json({ ok: true });
});

/** オーディオ音量ダッキング解除 */
apiRoutes.post("/audio/unduck", async (c) => {
  await audioPlayer.unduck();
  return c.json({ ok: true });
});

/** 会話履歴クリア */
apiRoutes.post("/clear", (c) => {
  clearHistory();
  return c.json({ status: "cleared" });
});
