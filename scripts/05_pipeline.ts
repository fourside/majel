import "jsr:@std/dotenv/load";
import { record } from "./01_record.ts";
import { transcribe } from "./02_transcribe.ts";
import { chat } from "./03_chat.ts";
import { speak } from "./04_speak.ts";

async function runOnce(): Promise<void> {
  const totalStart = performance.now();

  // 1. 録音
  const wavPath = await record({ duration: 0 }); // 無音検出で自動停止

  // 2. 音声認識
  const userText = await transcribe(wavPath);
  if (!userText.trim()) {
    console.log("(empty transcription, skipping)");
    return;
  }

  // 3. LLM 応答
  const responseText = await chat(userText);

  // 4. 読み上げ
  await speak(responseText);

  const totalElapsed = Math.round(performance.now() - totalStart);
  console.log(`--- Total: ${totalElapsed}ms ---\n`);
}

async function main(): Promise<void> {
  console.log("=== MAJEL Voice Assistant (Phase 0) ===");
  console.log("Press Enter to start recording, Ctrl+C to quit.\n");

  const buf = new Uint8Array(1);

  while (true) {
    // Enter キー待ち
    Deno.stdout.writeSync(
      new TextEncoder().encode("Ready. Press Enter to speak > "),
    );
    await Deno.stdin.read(buf);

    try {
      await runOnce();
    } catch (e) {
      console.error("Error:", e instanceof Error ? e.message : e);
    }
  }
}

main();
