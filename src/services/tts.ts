import OpenAI from "openai";
import { config } from "../config.ts";
import { playAudio } from "./audio.ts";

const client = new OpenAI();

/** OpenAI TTS API でテキストを音声合成し WAV バイト列を返す */
export async function synthesize(text: string): Promise<Uint8Array> {
  const response = await client.audio.speech.create({
    model: config.ttsModel,
    voice: config.ttsVoice,
    input: text,
    response_format: "wav",
  });
  return new Uint8Array(await response.arrayBuffer());
}

/** テキストを音声合成して再生する */
export async function speak(text: string): Promise<void> {
  console.log(`Speaking: ${text}`);
  const start = performance.now();

  const wav = await synthesize(text);

  const tmpFile = "/tmp/majel_response.wav";
  await Deno.writeFile(tmpFile, wav);

  const elapsed = Math.round(performance.now() - start);
  console.log(`Synthesized (${elapsed}ms), playing...`);

  await playAudio(tmpFile);
}
