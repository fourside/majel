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
const nightMinutes = timeToMinutes(schedule.nightTime);

/** 現在時刻（分）がスケジュールのどの区間にいるか判定 */
function evaluateSchedule(nowMinutes: number): { power: boolean; brightness: number } {

  if (isInRange(nowMinutes, offMinutes, onMinutes)) {
    return { power: false, brightness: 0 };
  }
  if (isInRange(nowMinutes, nightMinutes, offMinutes)) {
    return { power: true, brightness: schedule.nightBrightness };
  }
  return { power: true, brightness: schedule.dayBrightness };
}

// ── スタブ: Pi 到着後に実装 ──

/** ディスプレイの明るさを設定（0〜100%） */
export async function setBrightness(value: number): Promise<void> {
  console.log(`[display] setBrightness(${value}%) — stub`);
  // Pi 実装: /sys/class/backlight/*/brightness に書き込み
}

/** ディスプレイの電源をオン/オフ */
export async function setPower(on: boolean): Promise<void> {
  console.log(`[display] setPower(${on}) — stub`);
  // Pi 実装: xset dpms force on/off
}

/** 現在の明るさを取得（0〜100%） */
export async function getBrightness(): Promise<number | null> {
  // Pi 実装: /sys/class/backlight/*/brightness を読み取り
  return null;
}

// ── スケジューラー ──

let schedulerTimerId: number | undefined;
let lastPower: boolean | null = null;
let lastBrightness: number | null = null;

/** 1分ごとにスケジュールを評価してディスプレイを制御 */
export function startScheduler(): void {
  if (schedulerTimerId !== undefined) return;
  console.log("[display] Scheduler started");

  const tick = async () => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const action = evaluateSchedule(nowMinutes);

    // 状態が変わったときだけ制御を実行
    if (action.power !== lastPower || action.brightness !== lastBrightness) {
      if (!action.power) {
        await setPower(false);
      } else {
        await setPower(true);
        await setBrightness(action.brightness);
      }
      // 成功後に状態を更新（失敗時は次回 tick でリトライ）
      lastPower = action.power;
      lastBrightness = action.brightness;
    }
  };

  tick();
  schedulerTimerId = setInterval(tick, 60_000);
}

// テスト用にexport
export { evaluateSchedule as _evaluateSchedule, timeToMinutes as _timeToMinutes, isInRange as _isInRange };
