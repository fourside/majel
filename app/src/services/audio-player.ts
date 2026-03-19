export type PlaybackState = "idle" | "playing" | "paused";

const IPC_PATH = "/tmp/majel/mpv-ipc";
const AUDIO_DEVICE = "alsa/plughw:2,0";
const DEFAULT_VOLUME = 80;
const DUCK_VOLUME = 20;

let mpvProcess: Deno.ChildProcess | null = null;
let currentState: PlaybackState = "idle";
let currentLabel = "";

async function sendCommand(command: unknown[]): Promise<void> {
  try {
    const conn = await Deno.connect({ path: IPC_PATH, transport: "unix" });
    const msg = JSON.stringify({ command }) + "\n";
    await conn.write(new TextEncoder().encode(msg));
    // Read response to avoid broken pipe
    const buf = new Uint8Array(4096);
    await conn.read(buf);
    conn.close();
  } catch (e) {
    console.error("[audio-player] IPC command failed:", e);
  }
}

export function getPlaybackState(): PlaybackState {
  return currentState;
}

export function getPlaybackLabel(): string {
  return currentLabel;
}

export async function play(filePath: string, label: string): Promise<void> {
  if (mpvProcess) {
    await stop();
  }

  const cmd = new Deno.Command("mpv", {
    args: [
      `--input-ipc-server=${IPC_PATH}`,
      `--volume=${DEFAULT_VOLUME}`,
      `--audio-device=${AUDIO_DEVICE}`,
      "--no-video",
      "--really-quiet",
      filePath,
    ],
    stdout: "null",
    stderr: "null",
  });
  mpvProcess = cmd.spawn();
  currentState = "playing";
  currentLabel = label;
  console.log(`[audio-player] Playing: ${label} (${filePath})`);

  mpvProcess.status.then(() => {
    mpvProcess = null;
    currentState = "idle";
    currentLabel = "";
    console.log("[audio-player] Playback ended");
  });
}

export async function pause(): Promise<void> {
  if (currentState !== "playing") return;
  await sendCommand(["set_property", "pause", true]);
  currentState = "paused";
}

export async function resume(): Promise<void> {
  if (currentState !== "paused") return;
  await sendCommand(["set_property", "pause", false]);
  currentState = "playing";
}

export async function stop(): Promise<void> {
  if (!mpvProcess) return;
  await sendCommand(["quit"]);
  const timeout = setTimeout(() => {
    try {
      mpvProcess?.kill("SIGTERM");
    } catch { /* ignore */ }
  }, 2000);
  await mpvProcess.status;
  clearTimeout(timeout);
  mpvProcess = null;
  currentState = "idle";
  currentLabel = "";
}

export async function duck(): Promise<void> {
  if (currentState !== "playing") return;
  await sendCommand(["set_property", "volume", DUCK_VOLUME]);
}

export async function unduck(): Promise<void> {
  if (currentState !== "playing") return;
  await sendCommand(["set_property", "volume", DEFAULT_VOLUME]);
}
