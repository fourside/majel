import type OpenAI from "openai";
import { getWeather } from "../services/weather.ts";

/** GPT-4o-mini function calling 用ツール定義 */
export const toolDefinitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description:
        "指定した場所の現在の天気を取得する。場所が指定されない場合はデフォルト（東京）を使用する。",
      parameters: {
        type: "object",
        properties: {
          latitude: {
            type: "number",
            description: "緯度（例: 35.6895）",
          },
          longitude: {
            type: "number",
            description: "経度（例: 139.6917）",
          },
          location_name: {
            type: "string",
            description: "場所の名前（例: 東京）",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_current_time",
      description: "現在の日時を取得する。",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

/** ツール呼び出しを実行して結果を返す */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "get_weather": {
      const weather = await getWeather(
        args.latitude as number | undefined,
        args.longitude as number | undefined,
        args.location_name as string | undefined,
      );
      return JSON.stringify(weather);
    }
    case "get_current_time": {
      const now = new Date();
      const formatted = now.toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      });
      return JSON.stringify({ datetime: formatted });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
