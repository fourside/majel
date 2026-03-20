import { isDisplayOn, setBrightness } from "./display.ts";
import { getSensorData } from "./sensors.ts";

/**
 * 照度 (lux) → ディスプレイ輝度 (4〜100%) のマッピング（対数スケール）
 *
 *   < 10 lx   暗い部屋（就寝時）   4%
 *   10-50 lx  薄暗い部屋           20%
 *   50-200 lx 一般的な室内          50%
 *   200-500 lx 明るい室内           78%
 *   > 500 lx  直射日光・窓際        100%
 */
export function luxToPercent(lux: number): number {
  if (lux < 10) return 15;
  if (lux > 500) return 100;
  const ratio = (Math.log(lux) - Math.log(10)) / (Math.log(500) - Math.log(10));
  return Math.round(15 + ratio * 85);
}

let timerId: number | undefined;
let manualOverrideUntil: number = 0;

/** 手動設定後に自動調光を一時的に抑制（5分間） */
export function suppressAutoBrightness(): void {
  manualOverrideUntil = Date.now() + 5 * 60 * 1000;
}

/** 自動調光ループ開始（30秒間隔） */
export function startAutoBrightness(intervalMs = 30_000): void {
  if (timerId !== undefined) return;
  console.log("[auto-brightness] Started");

  timerId = setInterval(async () => {
    if (!isDisplayOn()) return;
    if (Date.now() < manualOverrideUntil) return;

    const sensor = getSensorData();
    if (sensor.light !== null) {
      const percent = luxToPercent(sensor.light);
      await setBrightness(percent);
    }
  }, intervalMs);
}
