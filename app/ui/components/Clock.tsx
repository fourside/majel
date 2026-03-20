import { useEffect, useRef } from "preact/hooks";
import styles from "./Clock.module.css";

export function Clock() {
  const digitsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const prevRef = useRef(["", "", "", ""]);

  useEffect(() => {
    updateDigits(digitsRef, prevRef);
    const timer = setInterval(() => updateDigits(digitsRef, prevRef), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div class={styles.clock}>
      <span
        class={styles.digit}
        ref={(el) => {
          digitsRef.current[0] = el;
        }}
      />
      <span
        class={styles.digit}
        ref={(el) => {
          digitsRef.current[1] = el;
        }}
      />
      <span class={styles.sep}>:</span>
      <span
        class={styles.digit}
        ref={(el) => {
          digitsRef.current[2] = el;
        }}
      />
      <span
        class={styles.digit}
        ref={(el) => {
          digitsRef.current[3] = el;
        }}
      />
    </div>
  );
}

function getTimeDigits(): [string, string, string, string] {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return [h[0], h[1], m[0], m[1]];
}

function flipDigit(el: HTMLSpanElement, value: string): void {
  el.textContent = value;
  el.classList.add(styles.flip);
  el.addEventListener(
    "animationend",
    () => el.classList.remove(styles.flip),
    { once: true },
  );
}

function updateDigits(
  digitsRef: preact.RefObject<(HTMLSpanElement | null)[]>,
  prevRef: preact.RefObject<string[]>,
): void {
  const values = getTimeDigits();
  for (let i = 0; i < 4; i++) {
    if (values[i] === prevRef.current![i]) continue;
    const el = digitsRef.current![i];
    if (!el) continue;
    flipDigit(el, values[i]);
  }
  prevRef.current = values;
}
