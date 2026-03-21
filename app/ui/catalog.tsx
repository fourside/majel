import { render } from "preact";
import { useState } from "preact/hooks";
import { Clock } from "./components/Clock.tsx";
import { ResponseView } from "./components/Response.tsx";
import { SensorsView } from "./components/Sensors.tsx";
import { StatusView } from "./components/Status.tsx";
import { TimerView } from "./components/Timer.tsx";
import { WeatherView } from "./components/Weather.tsx";
import type { Phase, SensorData } from "./signals.ts";
import hourlyStyles from "./components/HourlyAnnounce.module.css";

const mockSensors: SensorData = {
  temperature: 22.3,
  humidity: 48,
  pressure: 1013.2,
  light: 150,
  lightHistory: [80, 90, 120, 150, 200, 180, 160, 140, 100, 80, 60, 50],
};

const entries: { name: string; render: () => preact.ComponentChildren }[] = [
  {
    name: "Dashboard",
    render: () => (
      <div
        class="dashboard"
        style={{
          width: "800px",
          height: "480px",
          overflow: "hidden",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
        }}
      >
        <div class="top-bar">
          <Clock />
          <div class="weather">
            <WeatherView
              date="3/21 Fri"
              weather={{ weatherCode: 3, temperature: 18 }}
            />
          </div>
        </div>
        <div class="middle">
          <SensorsView data={mockSensors} />
        </div>
        <TimerView
          timer={{ active: true, label: "パスタ", remainingSec: 142 }}
        />
        <ResponseView
          user="きょうのてんきは？"
          text="きょうのかわさきのてんきは、くもりです。きおんは じゅうはちど、しつどは よんじゅうはちパーセントです。"
          error={null}
        />
        <div class="status-bar">
          <StatusView phase="done" disconnected={false} />
        </div>
      </div>
    ),
  },
  {
    name: "Clock",
    render: () => <Clock />,
  },
  {
    name: "Weather",
    render: () => (
      <div class="weather">
        <WeatherView
          date="3/21 Fri"
          weather={{ weatherCode: 0, temperature: 22 }}
        />
      </div>
    ),
  },
  {
    name: "Weather (loading)",
    render: () => (
      <div class="weather">
        <WeatherView date="3/21 Fri" weather={null} />
      </div>
    ),
  },
  {
    name: "Sensors",
    render: () => <SensorsView data={mockSensors} />,
  },
  {
    name: "Sensors (no data)",
    render: () => <SensorsView data={null} />,
  },
  {
    name: "Response",
    render: () => (
      <ResponseView
        user="きょうのてんきは？"
        text="きょうのかわさきのてんきは、はれです。きおんは にじゅうにど、しつどは よんじゅうはちパーセントです。"
        error={null}
      />
    ),
  },
  {
    name: "Response (error)",
    render: () => (
      <ResponseView
        user="テスト"
        text={null}
        error="すみません、接続に問題があるようです。"
      />
    ),
  },
  {
    name: "Timer",
    render: () => (
      <TimerView
        timer={{ active: true, label: "パスタ", remainingSec: 142 }}
      />
    ),
  },
  {
    name: "Status",
    render: () => {
      const phases: Phase[] = [
        "done",
        "listening",
        "transcribing",
        "thinking",
        "speaking",
      ];
      return (
        <div
          style={{
            display: "grid",
            gap: "12px",
          }}
        >
          {phases.map((p) => (
            <div
              key={p}
              style={{
                display: "grid",
                gridTemplateColumns: "80px auto",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.7rem",
                }}
              >
                {p}
              </span>
              <StatusView phase={p} disconnected={false} />
            </div>
          ))}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "80px auto",
              alignItems: "center",
            }}
          >
            <span
              style={{
                color: "var(--color-text-muted)",
                fontSize: "0.7rem",
              }}
            >
              disconnected
            </span>
            <StatusView phase="done" disconnected />
          </div>
        </div>
      );
    },
  },
  {
    name: "HourlyAnnounce",
    render: () => (
      <div
        class={hourlyStyles.overlay}
        style={{
          position: "relative",
          width: "800px",
          height: "480px",
          opacity: 1,
          borderRadius: "8px",
          border: "1px solid var(--color-border)",
        }}
      >
        <div class={hourlyStyles.date}>03/21 FRI</div>
        <div class={hourlyStyles.time}>13:00</div>
      </div>
    ),
  },
];

function Catalog() {
  const [selected, setSelected] = useState(0);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        height: "100vh",
      }}
    >
      <nav
        style={{
          borderRight: "1px solid var(--color-border)",
          padding: "12px 0",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "0 12px 12px",
            fontSize: "0.8rem",
            color: "var(--color-accent)",
            fontWeight: 700,
          }}
        >
          MAJEL Catalog
        </div>
        {entries.map((entry, i) => (
          <button
            type="button"
            key={entry.name}
            onClick={() => setSelected(i)}
            style={{
              display: "block",
              width: "100%",
              padding: "6px 12px",
              border: "none",
              background: i === selected
                ? "var(--color-bg-surface)"
                : "transparent",
              color: i === selected
                ? "var(--color-accent)"
                : "var(--color-text-muted)",
              fontSize: "0.75rem",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            {entry.name}
          </button>
        ))}
      </nav>
      <main style={{ padding: "16px", overflowY: "auto" }}>
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-muted)",
            marginBottom: "12px",
            borderBottom: "1px solid var(--color-border)",
            paddingBottom: "4px",
          }}
        >
          {entries[selected].name}
        </div>
        {entries[selected].render()}
      </main>
    </div>
  );
}

render(<Catalog />, document.querySelector(".catalog")!);
