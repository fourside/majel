import "jsr:@std/dotenv/load";
import { record } from "./01_record.ts";
import { transcribe } from "./02_transcribe.ts";
import { chat } from "./03_chat.ts";
import { speak } from "./04_speak.ts";

async function runOnce(): Promise<void> {
  const totalStart = performance.now();

  // 1. 録音 (5秒固定)
  const wavPath = await record({ duration: 5, output: "/tmp/majel_input.wav" });

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

async function waitForEnter(): Promise<void> {
  const reader = Deno.stdin.readable.getReader();
  try {
    while (true) {
      const { value } = await reader.read();
      if (value && value.includes(10)) break; // 10 = '\n'
    }
  } finally {
    reader.releaseLock();
  }
}

async function main(): Promise<void> {
  console.log("=== MAJEL Voice Assistant (Phase 0) ===");
  console.log("Press Enter to start recording, Ctrl+C to quit.\n");

  while (true) {
    Deno.stdout.writeSync(
      new TextEncoder().encode("Ready. Press Enter to speak > "),
    );
    await waitForEnter();

    try {
      await runOnce();
    } catch (e) {
      console.error("Error:", e instanceof Error ? e.message : e);
    }
  }
}

main();
