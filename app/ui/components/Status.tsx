import { useEffect, useState } from "preact/hooks";
import { phaseToLabel } from "../../static/lib/status.ts";
import { isDisconnected, type Phase, statusPhase } from "../signals.ts";
import styles from "./Status.module.css";

export function Status() {
  return (
    <StatusView
      phase={statusPhase.value}
      disconnected={isDisconnected.value}
    />
  );
}

export function StatusView(
  { phase, disconnected }: { phase: Phase; disconnected: boolean },
) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (phase !== "thinking") {
      setDots(0);
      return;
    }
    const timer = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(timer);
  }, [phase]);

  if (disconnected) {
    return (
      <>
        <div class={`${styles.dot} ${styles.disconnected}`} />
        <span class={styles.label}>切断中...</span>
      </>
    );
  }

  const isActive = phase !== "done";
  const dotClass = [
    styles.dot,
    isActive ? styles.active : "",
    isActive && styles[phase as keyof typeof styles]
      ? styles[phase as keyof typeof styles]
      : "",
  ].filter(Boolean).join(" ");

  const label = phase === "thinking"
    ? phaseToLabel(phase).replace(/\.+$/, "") + ".".repeat(dots)
    : phaseToLabel(phase);

  return (
    <>
      <div class={dotClass} />
      <span class={styles.label}>{label}</span>
    </>
  );
}
