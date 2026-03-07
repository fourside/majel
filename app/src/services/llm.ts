import OpenAI from "openai";
import { config } from "../config.ts";
import { toolDefinitions, executeTool } from "../tools/definitions.ts";

const SYSTEM_PROMPT = `あなたはMAJEL（メイジェル）という名前の音声アシスタントです。
Mostly Adequate Japanese Environment Listener の略です。

応答のルール:
- 音声読み上げを前提に、簡潔で自然な日本語で応答する
- マークダウン記法、箇条書き、記号は使わない
- 1応答は3文以内を目安にする
- 数値やデータは読み上げやすい形で伝える
- 天気や時刻を聞かれたらツールを使って正確な情報を返す`;

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI();
  return client;
}

const conversationHistory: ChatMessage[] = [];
const MAX_HISTORY = 20;
const MAX_TOOL_ROUNDS = 5;

/** 履歴が max を超えたら古い分を削除（in-place） */
function trimHistory<T>(history: T[], max: number): void {
  if (history.length > max) {
    history.splice(0, history.length - max);
  }
}

/** function calling 対応のチャット。ツール呼び出しがあれば自動で処理する。 */
export async function chat(userMessage: string): Promise<string> {
  conversationHistory.push({ role: "user", content: userMessage });
  trimHistory(conversationHistory, MAX_HISTORY);

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
  ];

  console.log("Thinking...");
  const start = performance.now();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await getClient().chat.completions.create({
      model: config.llmModel,
      max_tokens: 512,
      messages,
      tools: toolDefinitions,
    });

    const message = completion.choices[0].message;

    // ツール呼び出しがなければ最終応答
    if (!message.tool_calls || message.tool_calls.length === 0) {
      const assistantText = message.content ?? "";
      conversationHistory.push({ role: "assistant", content: assistantText });

      const elapsed = Math.round(performance.now() - start);
      console.log(`Response (${elapsed}ms): ${assistantText}`);
      return assistantText;
    }

    // ツール呼び出しを並列処理
    messages.push(message);

    const toolResults = await Promise.all(
      message.tool_calls.map(async (toolCall) => {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`Tool call: ${toolCall.function.name}(${JSON.stringify(args)})`);
        const result = await executeTool(toolCall.function.name, args);
        console.log(`Tool result: ${result}`);
        return { tool_call_id: toolCall.id, content: result };
      }),
    );
    for (const { tool_call_id, content } of toolResults) {
      messages.push({ role: "tool" as const, tool_call_id, content });
    }
  }

  // MAX_TOOL_ROUNDS に達した場合のフォールバック
  const fallback = "すみません、処理が複雑すぎるようです。もう少し簡単に聞いていただけますか？";
  conversationHistory.push({ role: "assistant", content: fallback });
  return fallback;
}

/** 会話履歴をクリア */
export function clearHistory(): void {
  conversationHistory.length = 0;
}

// テスト用にexport
export { conversationHistory as _conversationHistory, trimHistory as _trimHistory };
