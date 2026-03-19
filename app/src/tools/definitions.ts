import type OpenAI from "openai";
import { getWeather } from "../services/weather.ts";
import { getSensorData } from "../services/sensors.ts";
import { setBrightness, setPower } from "../services/display.ts";
import { suppressAutoBrightness } from "../services/auto-brightness.ts";
import { resolveNewsFile } from "../services/news.ts";
import * as audioPlayer from "../services/audio-player.ts";

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
  {
    type: "function",
    function: {
      name: "get_environment",
      description: "現在の室内環境データ（温度・湿度・気圧・照度）を取得する。",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_display_brightness",
      description:
        "ディスプレイの明るさを設定する。0〜100のパーセント値で指定する。",
      parameters: {
        type: "object",
        properties: {
          value: {
            type: "number",
            description: "明るさ（0〜100%）",
          },
        },
        required: ["value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_display_power",
      description: "ディスプレイの電源をオンまたはオフにする。",
      parameters: {
        type: "object",
        properties: {
          on: {
            type: "boolean",
            description: "trueでオン、falseでオフ",
          },
        },
        required: ["on"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "play_news",
      description: "最新のNHKラジオニュースを再生する",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["morning", "noon", "latest"],
            description: "朝のニュース、昼のニュース、または最新のニュース",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "stop_audio",
      description: "再生中のオーディオを停止する",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pause_audio",
      description:
        "再生中のオーディオを一時停止する。既に一時停止中なら再開する。",
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
    case "get_environment": {
      const env = getSensorData();
      if (env.temperature === null) {
        return JSON.stringify({
          error: "環境センサーのデータが取得できませんでした。",
        });
      }
      const result: Record<string, unknown> = {
        temperature: env.temperature,
        humidity: env.humidity,
        pressure: env.pressure,
        light: env.light,
        timestamp: env.timestamp,
      };
      if (env.co2 !== null) result.co2_ppm = env.co2;
      return JSON.stringify(result);
    }
    case "set_display_brightness": {
      const value = args.value as number;
      suppressAutoBrightness();
      await setBrightness(value);
      return JSON.stringify({ ok: true, brightness: value });
    }
    case "set_display_power": {
      const on = args.on as boolean;
      await setPower(on);
      return JSON.stringify({ ok: true, power: on });
    }
    case "play_news": {
      const period = (args.period as string | undefined) ?? "latest";
      const news = await resolveNewsFile(
        period as "morning" | "noon" | "latest",
      );
      if (!news) {
        return JSON.stringify({
          result:
            "ニュースの録音がまだありません。録音が完了するまでお待ちください。",
        });
      }
      await audioPlayer.play(news.path, news.label);
      const label = period === "morning"
        ? "朝"
        : period === "noon"
        ? "昼"
        : "最新";
      return JSON.stringify({ result: `${label}のニュースを再生します。` });
    }
    case "stop_audio": {
      if (audioPlayer.getPlaybackState() === "idle") {
        return JSON.stringify({ result: "現在、何も再生していません。" });
      }
      await audioPlayer.stop();
      return JSON.stringify({ result: "再生を停止しました。" });
    }
    case "pause_audio": {
      const state = audioPlayer.getPlaybackState();
      if (state === "playing") {
        await audioPlayer.pause();
        return JSON.stringify({
          result: "一時停止しました。「再開して」で続きを再生します。",
        });
      }
      if (state === "paused") {
        await audioPlayer.resume();
        return JSON.stringify({ result: "再生を再開します。" });
      }
      return JSON.stringify({ result: "現在、何も再生していません。" });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
