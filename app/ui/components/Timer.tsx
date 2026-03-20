import { type TimerData, timerData } from "../signals.ts";
import styles from "./Timer.module.css";

export function Timer() {
  return <TimerView timer={timerData.value} />;
}

export function TimerView({ timer }: { timer: TimerData | null }) {
  if (!timer?.active || timer.remainingSec === null) return null;

  return (
    <div class={styles.container}>
      <span class={styles.countdown}>{formatTime(timer.remainingSec)}</span>
      <span class={styles.label}>{timer.label}</span>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
