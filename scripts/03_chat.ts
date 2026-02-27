import "jsr:@std/dotenv/load";
import Anthropic from "npm:@anthropic-ai/sdk";

const SYSTEM_PROMPT = `あなたはMAJEL（メイジェル）という名前の音声アシスタントです。
Mostly Adequate Japanese Environment Listener の略です。

応答のルール:
- 音声読み上げを前提に、簡潔で自然な日本語で応答する
- マークダウン記法、箇条書き、記号は使わない
- 1応答は3文以内を目安にする
- 数値やデータは読み上げやすい形で伝える`;

const conversationHistory: Anthropic.MessageParam[] = [];

export async function chat(userMessage: string): Promise<string> {
  const client = new Anthropic();

  conversationHistory.push({ role: "user", content: userMessage });

  // 直近10ターンのみ保持
  const recentHistory = conversationHistory.slice(-20);

  console.log("Thinking...");
  const start = performance.now();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: recentHistory,
  });

  const assistantText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  conversationHistory.push({ role: "assistant", content: assistantText });

  const elapsed = Math.round(performance.now() - start);
  console.log(`Response (${elapsed}ms): ${assistantText}`);
  return assistantText;
}

if (import.meta.main) {
  const text = Deno.args[0] ?? "こんにちは、今何時ですか？";
  await chat(text);
}
