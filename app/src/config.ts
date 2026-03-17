import "@std/dotenv/load";

export type TtsEngine = "voicevox" | "openai";

export const config = {
  /** OpenAI API キー */
  openaiApiKey: Deno.env.get("OPENAI_API_KEY") ?? "",

  /** サーバーポート */
  port: parseInt(Deno.env.get("PORT") ?? "3000"),

  /** LLM モデル */
  llmModel: "gpt-5.4-nano",

  /** TTS エンジン */
  ttsEngine: (Deno.env.get("TTS_ENGINE") ?? "voicevox") as TtsEngine,

  /** OpenAI TTS モデル・ボイス */
  ttsModel: "tts-1",
  ttsVoice: "nova",

  /** VOICEVOX 設定 */
  voicevoxUrl: Deno.env.get("VOICEVOX_URL") ?? "http://voicevox:50021",
  voicevoxSpeaker: parseInt(Deno.env.get("VOICEVOX_SPEAKER") ?? "1"),

  /** STT 言語 */
  sttLanguage: "ja",

  /** 天気 API デフォルト位置（川崎） */
  weatherLat: 35.5308,
  weatherLon: 139.7030,
  weatherLocationName: "川崎",

  /** ディスプレイスケジュール（輝度は auto-brightness が制御） */
  displaySchedule: {
    offTime: "01:00",
    onTime: "06:00",
  },
} as const;

export function assertApiKey(): void {
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
}
