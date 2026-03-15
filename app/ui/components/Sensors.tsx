import { sensorData } from "../signals.ts";
// @ts-types="../../static/lib/format.js"
import { formatSensorParts } from "../../static/lib/format.js";
// @ts-types="../../static/lib/graph.js"
import { calculateBars } from "../../static/lib/graph.js";
import styles from "./Sensors.module.css";

const ICON_TEMP =
  `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#f44336" stroke-width="1.8" stroke-linecap="round">
  <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
  <circle cx="11.5" cy="17.5" r="1.5" fill="#f44336"/>
</svg>`;

const ICON_HUMIDITY =
  `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#4fc3f7" stroke-width="1.8" stroke-linecap="round">
  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  <path d="M8 14a4 4 0 0 0 4 4" stroke="#4fc3f7" stroke-width="1.2" opacity="0.5"/>
</svg>`;

const ICON_PRESSURE =
  `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#aaa" stroke-width="1.8" stroke-linecap="round">
  <circle cx="12" cy="12" r="9"/>
  <path d="M12 7v5l3 3"/>
  <circle cx="12" cy="12" r="1" fill="#aaa"/>
</svg>`;

const ICON_LIGHT =
  `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#fdd835" stroke-width="1.8" stroke-linecap="round">
  <circle cx="12" cy="12" r="4"/>
  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
</svg>`;

function SensorValue(
  { value, unit, decimals = 0 }: {
    value: number | null | undefined;
    unit: string;
    decimals?: number;
  },
) {
  const parts = formatSensorParts(value ?? null, unit, decimals);
  return (
    <span class={styles.value}>
      {parts.num}
      <span class={styles.unit}>{parts.unit}</span>
    </span>
  );
}

export function Sensors() {
  const data = sensorData.value;
  const history = data?.lightHistory ?? null;
  const recent = history && history.length > 32 ? history.slice(-32) : history;
  const bars = calculateBars(recent);

  return (
    <>
      <div class={styles.row}>
        <div class={styles.item}>
          <span
            class={styles.icon}
            dangerouslySetInnerHTML={{ __html: ICON_TEMP }}
          />
          <SensorValue value={data?.temperature} unit="°C" decimals={1} />
        </div>
        <div class={styles.item}>
          <span
            class={styles.icon}
            dangerouslySetInnerHTML={{ __html: ICON_HUMIDITY }}
          />
          <SensorValue value={data?.humidity} unit="%" />
        </div>
        <div class={styles.item}>
          <span
            class={styles.icon}
            dangerouslySetInnerHTML={{ __html: ICON_PRESSURE }}
          />
          <SensorValue value={data?.pressure} unit="hPa" />
        </div>
      </div>
      <div class={styles.row}>
        <div class={styles.item}>
          <span
            class={styles.icon}
            dangerouslySetInnerHTML={{ __html: ICON_LIGHT }}
          />
          <SensorValue value={data?.light} unit="lx" />
        </div>
        <div class={styles.graph}>
          {bars.map((bar: { height: number; dim: boolean }, i: number) => (
            <div
              key={i}
              class={`${styles.bar}${bar.dim ? ` ${styles.dim}` : ""}`}
              style={{ height: `${bar.height}px` }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
