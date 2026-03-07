interface RecordOptions {
  /** 録音時間（秒） */
  duration?: number;
  /** 出力ファイルパス */
  output?: string;
}

/** WSL パスを Windows パス (\\wsl$\...) に変換 */
async function toWinPath(wslPath: string): Promise<string> {
  const abs = wslPath.startsWith("/")
    ? wslPath
    : `${Deno.cwd()}/${wslPath}`;
  const cmd = new Deno.Command("wslpath", {
    args: ["-w", abs],
    stdout: "piped",
  });
  const { stdout } = await cmd.output();
  return new TextDecoder().decode(stdout).trim();
}

export async function record(options: RecordOptions = {}): Promise<string> {
  const { duration = 5, output = "recording.wav" } = options;

  const winOutput = await toWinPath(output);
  const scriptDir = new URL(".", import.meta.url).pathname;
  const winScript = await toWinPath(`${scriptDir}record.ps1`);

  const cmd = new Deno.Command("powershell.exe", {
    args: [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      winScript,
      "-Seconds",
      String(duration),
      "-OutputPath",
      winOutput,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  console.log(`Recording for ${duration} seconds...`);
  const { code, stdout, stderr } = await cmd.output();
  const out = new TextDecoder().decode(stdout).trim();
  if (out) console.log(out);

  if (code !== 0) {
    const err = new TextDecoder().decode(stderr);
    throw new Error(`Recording failed: ${err}`);
  }

  console.log(`Saved: ${output}`);
  return output;
}

// 直接実行時
if (import.meta.main) {
  const args = Deno.args.filter((a) => a !== "--");
  const duration = parseInt(args[0] ?? "5");
  await record({ duration });
}
