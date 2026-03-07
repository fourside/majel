import OpenAI from "openai";
import { config } from "../config.ts";

const client = new OpenAI();

/** WAV ファイルを OpenAI Whisper API でテキストに変換 */
export async function transcribe(wavPath: string): Promise<string> {
  const wavData = await Deno.readFile(wavPath);
  const file = new File([wavData], "recording.wav", { type: "audio/wav" });

  console.log("Transcribing...");
  const start = performance.now();

  const result = await client.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: config.sttLanguage,
  });

  const elapsed = Math.round(performance.now() - start);
  console.log(`Transcribed (${elapsed}ms): ${result.text}`);
  return result.text;
}
