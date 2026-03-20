import { timerData } from "../signals.ts";
import styles from "./Timer.module.css";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Timer() {
  const timer = timerData.value;
  if (!timer?.active || timer.remainingSec === null) return null;

  return (
    <div class={styles.container}>
      <span class={styles.countdown}>{formatTime(timer.remainingSec)}</span>
      <span class={styles.label}>{timer.label}</span>
    </div>
  );
}
