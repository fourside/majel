import type { AuthResult } from "./auth.ts";

const STATION_ID = "JOAK";

async function fetchLiveStreamUrl(stationId: string): Promise<string> {
  const res = await fetch(
    `https://radiko.jp/v3/station/stream/pc_html5/${stationId}.xml`,
  );
  if (!res.ok) {
    throw new Error(`station stream xml failed: ${res.status}`);
  }
  const body = await res.text();

  // Extract playlist_create_url for live (timefree='0', areafree='0')
  const regex =
    /<url\s+(?=[^>]*areafree="0")(?=[^>]*timefree="0")[^>]*>[\s\S]*?<playlist_create_url>([^<]+)<\/playlist_create_url>/g;
  const urls = [...body.matchAll(regex)].map((m) => m[1].trim());

  if (urls.length === 0) {
    throw new Error("no live stream URL found");
  }
  return urls[0];
}

function buildStreamUrl(
  playlistUrl: string,
  stationId: string,
): string {
  const lsid = crypto.randomUUID().replace(/-/g, "");
  return `${playlistUrl}?station_id=${stationId}&l=15&lsid=${lsid}&type=b`;
}

export async function recordLiveStream(
  auth: AuthResult,
  durationMin: number,
  outputPath: string,
): Promise<void> {
  const playlistUrl = await fetchLiveStreamUrl(STATION_ID);
  console.log(`Playlist URL: ${playlistUrl}`);

  const streamUrl = buildStreamUrl(playlistUrl, STATION_ID);
  console.log(`Stream URL: ${streamUrl}`);

  const durationSec = durationMin * 60;

  const cmd = new Deno.Command("ffmpeg", {
    args: [
      "-loglevel", "warning",
      "-fflags", "+discardcorrupt",
      "-headers", `X-Radiko-AuthToken: ${auth.authToken}\r\nX-Radiko-AreaId: ${auth.areaId}\r\n`,
      "-user_agent", "Lavf/58.76.100",
      "-http_seekable", "0",
      "-seekable", "0",
      "-i", streamUrl,
      "-t", String(durationSec),
      "-c:a", "aac",
      "-b:a", "128k",
      "-vn",
      "-y",
      outputPath,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  console.log(`Recording ${durationMin}min to ${outputPath}...`);
  const { code, stderr } = await cmd.output();

  if (code !== 0) {
    const error = new TextDecoder().decode(stderr);
    throw new Error(`ffmpeg failed (exit ${code}): ${error}`);
  }

  console.log(`Recorded: ${outputPath}`);
}
