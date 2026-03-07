import "jsr:@std/dotenv/load";
import OpenAI from "npm:openai";

const SYSTEM_PROMPT = `あなたはMAJEL（メイジェル）という名前の音声アシスタントです。
Mostly Adequate Japanese Environment Listener の略です。

応答のルール:
- 音声読み上げを前提に、簡潔で自然な日本語で応答する
- マークダウン記法、箇条書き、記号は使わない
- 1応答は3文以内を目安にする
- 数値やデータは読み上げやすい形で伝える`;

type ChatMessage = { role: "user" | "assistant"; content: string };

const conversationHistory: ChatMessage[] = [];

export async function chat(userMessage: string): Promise<string> {
  const client = new OpenAI();

  conversationHistory.push({ role: "user", content: userMessage });

  // 直近10ターンのみ保持
  const recentHistory = conversationHistory.slice(-20);

  console.log("Thinking...");
  const start = performance.now();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 512,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...recentHistory,
    ],
  });

  const assistantText = completion.choices[0]?.message?.content ?? "";

  conversationHistory.push({ role: "assistant", content: assistantText });

  const elapsed = Math.round(performance.now() - start);
  console.log(`Response (${elapsed}ms): ${assistantText}`);
  return assistantText;
}

if (import.meta.main) {
  const text = Deno.args[0] ?? "こんにちは、今何時ですか？";
  await chat(text);
}
