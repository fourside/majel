import { config } from "../config.ts";

const schedule = config.displaySchedule;

/** 時刻文字列 "HH:MM" を当日の分数に変換 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** nowMinutes が [start, end) の範囲内か判定（日跨ぎ対応） */
function isInRange(nowMinutes: number, start: number, end: number): boolean {
  if (start <= end) {
    return nowMinutes >= start && nowMinutes < end;
  }
  return nowMinutes >= start || nowMinutes < end;
}

// スケジュール時刻を事前計算（config は as const で不変）
const offMinutes = timeToMinutes(schedule.offTime);
const onMinutes = timeToMinutes(schedule.onTime);

/** 現在時刻（分）が消灯区間かどうか判定（輝度は auto-brightness が制御） */
function evaluateSchedule(nowMinutes: number): { power: boolean } {
  if (isInRange(nowMinutes, offMinutes, onMinutes)) {
    return { power: false };
  }
  return { power: true };
}

// ── バックライト制御 ──

const BACKLIGHT_DIR = "/sys/class/backlight";
const MAX_BRIGHTNESS = 255;
const MIN_BRIGHTNESS = 10;

let backlightPath: string | null | undefined; // undefined = 未検出

async function detectBacklightPath(): Promise<string | null> {
  try {
    for await (const entry of Deno.readDir(BACKLIGHT_DIR)) {
      if (entry.isDirectory) {
        return `${BACKLIGHT_DIR}/${entry.name}/brightness`;
      }
    }
  } catch {
    // ディレクトリが存在しない（開発環境など）
  }
  return null;
}

async function getBacklightPath(): Promise<string | null> {
  if (backlightPath === undefined) {
    backlightPath = await detectBacklightPath();
    if (backlightPath) {
      console.log(`[display] Backlight path: ${backlightPath}`);
    } else {
      console.log("[display] No backlight device found (dev mode)");
    }
  }
  return backlightPath;
}

async function writeBacklight(rawValue: number, label: string): Promise<void> {
  const path = await getBacklightPath();
  if (!path) {
    console.log(`[display] ${label} — stub`);
    return;
  }
  await Deno.writeTextFile(path, String(rawValue));
}

/** ディスプレイの明るさを設定（0〜100%） */
export async function setBrightness(percent: number): Promise<void> {
  const value = Math.max(
    MIN_BRIGHTNESS,
    Math.min(MAX_BRIGHTNESS, Math.round((percent / 100) * MAX_BRIGHTNESS)),
  );
  await writeBacklight(value, `setBrightness(${percent}%)`);
}

/** ディスプレイの電源をオン/オフ */
export async function setPower(on: boolean): Promise<void> {
  await writeBacklight(on ? MAX_BRIGHTNESS : 0, `setPower(${on})`);
}

/** 現在の明るさを取得（0〜100%） */
export async function getBrightness(): Promise<number | null> {
  const path = await getBacklightPath();
  if (!path) return null;
  try {
    const raw = await Deno.readTextFile(path);
    const value = parseInt(raw.trim(), 10);
    return Math.round((value / MAX_BRIGHTNESS) * 100);
  } catch {
    return null;
  }
}

// ── スケジューラー ──

let schedulerTimerId: number | undefined;
let lastPower: boolean | null = null;

/** 1分ごとにスケジュールを評価してディスプレイ電源を制御 */
export function startScheduler(): void {
  if (schedulerTimerId !== undefined) return;
  console.log("[display] Scheduler started");

  const tick = async () => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const action = evaluateSchedule(nowMinutes);

    if (action.power !== lastPower) {
      await setPower(action.power);
      lastPower = action.power;
    }
  };

  tick();
  schedulerTimerId = setInterval(tick, 60_000);
}

/** スケジューラーが管理する現在の電源状態 */
export function isDisplayOn(): boolean {
  return lastPower !== false;
}

// テスト用にexport
export {
  evaluateSchedule as _evaluateSchedule,
  isInRange as _isInRange,
  timeToMinutes as _timeToMinutes,
};
