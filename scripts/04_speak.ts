import "jsr:@std/dotenv/load";

type TTSEngine = "voicevox" | "openai";

const DEFAULT_ENGINE: TTSEngine = "voicevox";

async function synthesizeVoicevox(
  text: string,
  speaker = 1,
): Promise<Uint8Array> {
  const baseUrl = "http://localhost:50021";

  // 1. 音声クエリ生成
  const queryRes = await fetch(
    `${baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
    { method: "POST" },
  );
  if (!queryRes.ok)
    throw new Error(`VOICEVOX audio_query failed: ${queryRes.status}`);
  const query = await queryRes.json();

  // 2. 音声合成
  const synthRes = await fetch(`${baseUrl}/synthesis?speaker=${speaker}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!synthRes.ok)
    throw new Error(`VOICEVOX synthesis failed: ${synthRes.status}`);
  return new Uint8Array(await synthRes.arrayBuffer());
}

async function synthesizeOpenAI(text: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "nova",
      input: text,
      response_format: "wav",
    }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function speak(
  text: string,
  engine: TTSEngine = DEFAULT_ENGINE,
): Promise<void> {
  console.log(`Speaking (${engine}): ${text}`);
  const start = performance.now();

  const wav =
    engine === "voicevox"
      ? await synthesizeVoicevox(text)
      : await synthesizeOpenAI(text);

  const tmpFile = "/tmp/majel_response.wav";
  await Deno.writeFile(tmpFile, wav);

  const elapsed = Math.round(performance.now() - start);
  console.log(`Synthesized (${elapsed}ms), playing...`);

  // WSL Ubuntu では aplay で再生
  const cmd = new Deno.Command("aplay", {
    args: [tmpFile],
    stdout: "null",
    stderr: "piped",
  });
  const { code, stderr } = await cmd.output();
  if (code !== 0) {
    const err = new TextDecoder().decode(stderr);

    // aplay が失敗した場合、paplay (PulseAudio) を試す
    console.warn(`aplay failed: ${err}, trying paplay...`);
    const fallback = new Deno.Command("paplay", {
      args: [tmpFile],
      stdout: "null",
      stderr: "piped",
    });
    const result = await fallback.output();
    if (result.code !== 0) {
      throw new Error(`Audio playback failed`);
    }
  }
}

if (import.meta.main) {
  const text = Deno.args[0] ?? "こんにちは、メイジェルです。ご用件をどうぞ。";
  const engine = (Deno.args[1] as TTSEngine) ?? DEFAULT_ENGINE;
  await speak(text, engine);
}
