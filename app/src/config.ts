import "@std/dotenv/load";

export const config = {
  /** OpenAI API キー */
  openaiApiKey: Deno.env.get("OPENAI_API_KEY") ?? "",

  /** サーバーポート */
  port: parseInt(Deno.env.get("PORT") ?? "3000"),

  /** LLM モデル */
  llmModel: "gpt-4o-mini",

  /** TTS モデル・ボイス */
  ttsModel: "tts-1",
  ttsVoice: "nova",

  /** STT 言語 */
  sttLanguage: "ja",

  /** 天気 API デフォルト位置（東京） */
  weatherLat: 35.6895,
  weatherLon: 139.6917,
  weatherLocationName: "東京",

  /** ディスプレイスケジュール */
  displaySchedule: {
    offTime: "00:00",
    onTime: "06:00",
    nightTime: "22:00",
    nightBrightness: 30,
    dayBrightness: 80,
  },
} as const;

export function assertApiKey(): void {
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
}
