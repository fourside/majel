import "jsr:@std/dotenv/load";

export async function transcribe(wavPath: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const wavData = await Deno.readFile(wavPath);
  const form = new FormData();
  form.append(
    "file",
    new Blob([wavData], { type: "audio/wav" }),
    "recording.wav",
  );
  form.append("model", "whisper-1");
  form.append("language", "ja");

  console.log("Transcribing...");
  const start = performance.now();

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper API error (${res.status}): ${err}`);
  }

  const { text } = await res.json();
  const elapsed = Math.round(performance.now() - start);
  console.log(`Transcribed (${elapsed}ms): ${text}`);
  return text;
}

if (import.meta.main) {
  const path = Deno.args[0] ?? "recording.wav";
  await transcribe(path);
}
