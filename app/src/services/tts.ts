import OpenAI from "openai";
import { config } from "../config.ts";
import { playAudio } from "./audio.ts";

const client = new OpenAI();

/** VOICEVOX ENGINE で音声合成し WAV バイト列を返す */
async function synthesizeVoicevox(text: string): Promise<Uint8Array> {
  const { voicevoxUrl, voicevoxSpeaker } = config;

  const queryRes = await fetch(
    `${voicevoxUrl}/audio_query?text=${
      encodeURIComponent(text)
    }&speaker=${voicevoxSpeaker}`,
    { method: "POST" },
  );
  if (!queryRes.ok) {
    throw new Error(`VOICEVOX audio_query failed: ${queryRes.status}`);
  }
  const query = await queryRes.json();

  const synthRes = await fetch(
    `${voicevoxUrl}/synthesis?speaker=${voicevoxSpeaker}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    },
  );
  if (!synthRes.ok) {
    throw new Error(`VOICEVOX synthesis failed: ${synthRes.status}`);
  }
  return new Uint8Array(await synthRes.arrayBuffer());
}

/** OpenAI TTS API で音声合成し WAV バイト列を返す */
async function synthesizeOpenAI(text: string): Promise<Uint8Array> {
  const response = await client.audio.speech.create({
    model: config.ttsModel,
    voice: config.ttsVoice,
    input: text,
    response_format: "wav",
  });
  return new Uint8Array(await response.arrayBuffer());
}

/** テキストを音声合成し WAV バイト列を返す。VOICEVOX 失敗時は OpenAI にフォールバック */
export async function synthesize(text: string): Promise<Uint8Array> {
  if (config.ttsEngine === "voicevox") {
    try {
      return await synthesizeVoicevox(text);
    } catch (e) {
      console.warn(`[tts] VOICEVOX failed, falling back to OpenAI:`, e);
      return await synthesizeOpenAI(text);
    }
  }
  return await synthesizeOpenAI(text);
}

/** テキストを音声合成して再生する */
export async function speak(text: string): Promise<void> {
  console.log(`Speaking: ${text}`);
  const start = performance.now();

  const wav = await synthesize(text);

  const tmpFile = "/tmp/majel/response.wav";
  await Deno.writeFile(tmpFile, wav);

  const elapsed = Math.round(performance.now() - start);
  console.log(`Synthesized (${elapsed}ms), playing...`);

  await playAudio(tmpFile);
}
