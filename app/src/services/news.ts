const NEWS_DIR = "/data/news";

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function resolveNewsFile(
  period: "morning" | "noon" | "latest",
): Promise<{ path: string; label: string } | null> {
  if (period === "morning") {
    const path = `${NEWS_DIR}/latest_am.m4a`;
    return (await exists(path)) ? { path, label: "NHKニュース (朝)" } : null;
  }
  if (period === "noon") {
    const path = `${NEWS_DIR}/latest_noon.m4a`;
    return (await exists(path)) ? { path, label: "NHKニュース (昼)" } : null;
  }

  // "latest": 現在時刻に応じて直近の録音を返す
  const now = new Date();
  const hour = now.getHours();
  const min = now.getMinutes();

  const noonPath = `${NEWS_DIR}/latest_noon.m4a`;
  const amPath = `${NEWS_DIR}/latest_am.m4a`;

  if ((hour > 12 || (hour === 12 && min >= 15)) && (await exists(noonPath))) {
    return { path: noonPath, label: "NHKニュース (昼)" };
  }
  if (await exists(amPath)) {
    return { path: amPath, label: "NHKニュース (朝)" };
  }
  if (await exists(noonPath)) {
    return { path: noonPath, label: "NHKニュース (昼)" };
  }
  return null;
}
