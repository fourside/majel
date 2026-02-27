const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BIT_DEPTH = 16;

interface RecordOptions {
  /** 録音時間（秒）。0 なら無音検出で自動停止 */
  duration?: number;
  /** 出力ファイルパス */
  output?: string;
}

export async function record(options: RecordOptions = {}): Promise<string> {
  const { duration = 5, output = "recording.wav" } = options;

  const env: Record<string, string> = {};
  // WSLg PulseAudio
  const pulseServer = "/mnt/wslg/PulseServer";
  try {
    await Deno.stat(pulseServer);
    env.PULSE_SERVER = `unix:${pulseServer}`;
  } catch {
    // PulseServer が見つからなければデフォルトで進む
  }

  if (duration > 0) {
    // 固定時間録音
    const cmd = new Deno.Command("sox", {
      args: [
        "-d", // デフォルトオーディオデバイス
        "-r",
        String(SAMPLE_RATE),
        "-c",
        String(CHANNELS),
        "-b",
        String(BIT_DEPTH),
        output,
        "trim",
        "0",
        String(duration),
      ],
      env,
      stdout: "null",
      stderr: "piped",
    });
    console.log(`Recording for ${duration} seconds...`);
    const { code, stderr } = await cmd.output();
    if (code !== 0) {
      const err = new TextDecoder().decode(stderr);
      throw new Error(`Recording failed: ${err}`);
    }
  } else {
    // 無音検出で自動停止
    // silence 1 0.1 1% : 先頭の無音をスキップ
    // 1 1.5 1%          : 1.5秒の無音で録音停止
    const cmd = new Deno.Command("sox", {
      args: [
        "-d",
        "-r",
        String(SAMPLE_RATE),
        "-c",
        String(CHANNELS),
        "-b",
        String(BIT_DEPTH),
        output,
        "silence",
        "1",
        "0.1",
        "1%",
        "1",
        "1.5",
        "1%",
      ],
      env,
      stdout: "null",
      stderr: "piped",
    });
    console.log("Recording... (speak, then pause to stop)");
    const { code, stderr } = await cmd.output();
    if (code !== 0) {
      const err = new TextDecoder().decode(stderr);
      throw new Error(`Recording failed: ${err}`);
    }
  }

  console.log(`Saved: ${output}`);
  return output;
}

// 直接実行時
if (import.meta.main) {
  const duration = parseInt(Deno.args[0] ?? "5");
  await record({ duration });
}
