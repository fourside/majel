import "jsr:@std/dotenv/load";

type TTSEngine = "voicevox" | "openai";

const DEFAULT_ENGINE: TTSEngine = "openai";

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

  // WSL パスを Windows パスに変換
  const wslpathCmd = new Deno.Command("wslpath", {
    args: ["-w", tmpFile],
    stdout: "piped",
  });
  const { stdout: wslpathOut } = await wslpathCmd.output();
  const winSrc = new TextDecoder().decode(wslpathOut).trim();

  // Windows 側の一時ファイルにコピーして再生 (MediaPlayer は 24kHz WAV に対応)
  const cmd = new Deno.Command("powershell.exe", {
    args: [
      "-NoProfile",
      "-Command",
      [
        `Add-Type -AssemblyName PresentationCore`,
        `$tmp = Join-Path $env:TEMP 'majel_response.wav'`,
        `Copy-Item -LiteralPath '${winSrc.replace(/'/g, "''")}' -Destination $tmp -Force`,
        `$p = New-Object System.Windows.Media.MediaPlayer`,
        `$p.Open([Uri]::new($tmp))`,
        `Start-Sleep -Milliseconds 200`,
        `$p.Play()`,
        `while ($p.NaturalDuration.HasTimeSpan -eq $false) { Start-Sleep -Milliseconds 100 }`,
        `Start-Sleep -Milliseconds ([int]$p.NaturalDuration.TimeSpan.TotalMilliseconds + 200)`,
        `$p.Close()`,
        `Remove-Item $tmp -Force -ErrorAction SilentlyContinue`,
      ].join("; "),
    ],
    stdout: "null",
    stderr: "piped",
  });
  const { code, stderr } = await cmd.output();
  if (code !== 0) {
    const err = new TextDecoder().decode(stderr);
    throw new Error(`Audio playback failed: ${err}`);
  }
}

if (import.meta.main) {
  const args = Deno.args.filter((a) => a !== "--");
  const text = args[0] ?? "こんにちは、メイジェルです。ご用件をどうぞ。";
  const engine = (args[1] as TTSEngine) ?? DEFAULT_ENGINE;
  await speak(text, engine);
}
