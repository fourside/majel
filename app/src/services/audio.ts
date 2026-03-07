const decoder = new TextDecoder();

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
  return decoder.decode(stdout).trim();
}

export interface RecordOptions {
  duration?: number;
  output?: string;
}

/** マイクから録音して WAV ファイルを生成 */
export async function record(options: RecordOptions = {}): Promise<string> {
  const { duration = 5, output = "recording.wav" } = options;

  const winOutput = await toWinPath(output);
  const scriptDir = new URL("../", import.meta.url).pathname;
  const winScript = await toWinPath(`${scriptDir}../scripts/record.ps1`);

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
  const out = decoder.decode(stdout).trim();
  if (out) console.log(out);

  if (code !== 0) {
    throw new Error(`Recording failed: ${decoder.decode(stderr)}`);
  }

  console.log(`Saved: ${output}`);
  return output;
}

/** Windows 側で WAV ファイルを再生 */
export async function playAudio(wavPath: string): Promise<void> {
  const winSrc = await toWinPath(wavPath);

  const cmd = new Deno.Command("powershell.exe", {
    args: [
      "-NoProfile",
      "-Command",
      [
        `Add-Type -AssemblyName PresentationCore`,
        `$tmp = Join-Path $env:TEMP 'majel_response.wav'`,
        `Copy-Item -LiteralPath '${winSrc.replace(/'/g, "''")}' -Destination $tmp -Force`,
        `$p = New-Object System.Windows.Media.MediaPlayer`,
        `$p.Open([Uri]::new($tmp))`,
        `Start-Sleep -Milliseconds 200`,
        `$p.Play()`,
        `while ($p.NaturalDuration.HasTimeSpan -eq $false) { Start-Sleep -Milliseconds 100 }`,
        `Start-Sleep -Milliseconds ([int]$p.NaturalDuration.TimeSpan.TotalMilliseconds + 200)`,
        `$p.Close()`,
        `Remove-Item $tmp -Force -ErrorAction SilentlyContinue`,
      ].join("; "),
    ],
    stdout: "null",
    stderr: "piped",
  });
  const { code, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(`Audio playback failed: ${decoder.decode(stderr)}`);
  }
}
