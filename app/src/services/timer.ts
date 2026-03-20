import * as audioPlayer from "./audio-player.ts";

const ALARM_FILE = new URL("../../static/alarm.mp3", import.meta.url).pathname;

let timerId: number | null = null;
let timerLabel = "";
let timerEndsAt: number | null = null;

export function setTimer(
  durationSec: number,
  label: string,
): { ok: true } | { ok: false; reason: string } {
  if (timerId !== null) {
    return {
      ok: false,
      reason:
        "すでにタイマーがセットされています。先にキャンセルしてください。",
    };
  }

  timerLabel = label;
  timerEndsAt = Date.now() + durationSec * 1000;

  timerId = setTimeout(async () => {
    console.log(`[timer] Alarm! (${timerLabel})`);
    timerId = null;
    timerLabel = "";
    timerEndsAt = null;
    try {
      await audioPlayer.play(ALARM_FILE, "タイマー");
    } catch (e) {
      console.error("[timer] Failed to play alarm:", e);
    }
  }, durationSec * 1000);

  console.log(`[timer] Set: ${label} (${durationSec}s)`);
  return { ok: true };
}

export function cancelTimer(): { ok: true } | { ok: false; reason: string } {
  if (timerId === null) {
    return { ok: false, reason: "セットされているタイマーはありません。" };
  }

  clearTimeout(timerId);
  console.log(`[timer] Cancelled: ${timerLabel}`);
  timerId = null;
  timerLabel = "";
  timerEndsAt = null;
  return { ok: true };
}

export function getTimerStatus(): {
  active: boolean;
  label: string;
  remainingSec: number | null;
} {
  if (timerId === null || timerEndsAt === null) {
    return { active: false, label: "", remainingSec: null };
  }
  const remaining = Math.max(0, Math.round((timerEndsAt - Date.now()) / 1000));
  return { active: true, label: timerLabel, remainingSec: remaining };
}
