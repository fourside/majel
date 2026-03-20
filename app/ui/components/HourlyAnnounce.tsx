import { useEffect, useState } from "preact/hooks";
import styles from "./HourlyAnnounce.module.css";

const DISPLAY_DURATION = 15_000;

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function formatDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const wday = WEEKDAYS[d.getDay()];
  return `${mm}/${dd} ${wday}`;
}

function formatTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function HourlyAnnounce() {
  const [visible, setVisible] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    let hideTimer: number | null = null;
    let lastTriggeredHour = -1;

    function check() {
      const now = new Date();
      if (now.getMinutes() === 0 && now.getHours() !== lastTriggeredHour) {
        lastTriggeredHour = now.getHours();
        setDate(formatDate(now));
        setTime(formatTime(now));
        setVisible(true);
        if (hideTimer !== null) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => setVisible(false), DISPLAY_DURATION);
      }
    }

    check();
    const interval = setInterval(check, 1000);
    return () => {
      clearInterval(interval);
      if (hideTimer !== null) clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div class={`${styles.overlay} ${visible ? styles.visible : ""}`}>
      <div class={styles.date}>{date}</div>
      <div class={styles.time}>{time}</div>
    </div>
  );
}
