import { render } from "preact";
import { Clock } from "./components/Clock.tsx";
import { WeatherView } from "./components/Weather.tsx";
import { SensorsView } from "./components/Sensors.tsx";
import { ResponseView } from "./components/Response.tsx";
import { TimerView } from "./components/Timer.tsx";
import { StatusView } from "./components/Status.tsx";
import type { SensorData } from "./signals.ts";

const mockSensors: SensorData = {
  temperature: 22.3,
  humidity: 48,
  pressure: 1013.2,
  light: 150,
  lightHistory: [80, 90, 120, 150, 200, 180, 160, 140, 100, 80, 60, 50],
};

function DashboardPreview() {
  return (
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
            date="3 / 21 Fri"
            weather={{ weatherCode: 3, temperature: 18 }}
          />
        </div>
      </div>
      <div class="middle">
        <SensorsView data={mockSensors} />
      </div>
      <TimerView timer={{ active: true, label: "パスタ", remainingSec: 142 }} />
      <ResponseView
        user="きょうの天気は？"
        text="きょうのかわさきのてんきは、くもりです。きおんは じゅうはちど、しつどは よんじゅうはちパーセントです。"
        error={null}
      />
      <div class="status-bar">
        <StatusView phase="done" disconnected={false} />
      </div>
    </div>
  );
}

function Catalog() {
  return (
    <div
      style={{
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <h1
        style={{
          color: "var(--color-accent)",
          fontSize: "1.2rem",
          margin: 0,
        }}
      >
        MAJEL Component Catalog
      </h1>

      <CatalogItem title="Dashboard (800x480 integrated layout)">
        <DashboardPreview />
      </CatalogItem>

      <CatalogItem title="Clock">
        <Clock />
      </CatalogItem>

      <CatalogItem title="Weather">
        <div class="weather">
          <WeatherView
            date="3 / 20 Fri"
            weather={{ weatherCode: 0, temperature: 22 }}
          />
        </div>
      </CatalogItem>

      <CatalogItem title="Weather (loading)">
        <div class="weather">
          <WeatherView date="3 / 20 Fri" weather={null} />
        </div>
      </CatalogItem>

      <CatalogItem title="Sensors">
        <SensorsView data={mockSensors} />
      </CatalogItem>

      <CatalogItem title="Sensors (no data)">
        <SensorsView data={null} />
      </CatalogItem>

      <CatalogItem title="Response (typewriter)">
        <ResponseView
          user="きょうの天気は？"
          text="きょうのかわさきのてんきは、はれです。きおんは にじゅうにど、しつどは よんじゅうはちパーセントです。"
          error={null}
        />
      </CatalogItem>

      <CatalogItem title="Response (error)">
        <ResponseView
          user="テスト"
          text={null}
          error="すみません、接続に問題があるようです。"
        />
      </CatalogItem>

      <CatalogItem title="Timer (active)">
        <TimerView
          timer={{ active: true, label: "パスタ", remainingSec: 142 }}
        />
      </CatalogItem>

      <CatalogItem title="Timer (inactive)">
        <TimerView timer={null} />
      </CatalogItem>

      <CatalogItem title="Status (variants)">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {(["done", "listening", "thinking", "speaking"] as const).map((p) => (
            <div
              key={p}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.7rem",
                  width: "80px",
                }}
              >
                {p}
              </span>
              <StatusView phase={p} disconnected={false} />
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                color: "var(--color-text-muted)",
                fontSize: "0.7rem",
                width: "80px",
              }}
            >
              disconnected
            </span>
            <StatusView phase="done" disconnected={true} />
          </div>
        </div>
      </CatalogItem>

      <CatalogItem title="HourlyAnnounce (preview)">
        <div
          style={{
            position: "relative",
            width: "400px",
            height: "240px",
            background: "var(--color-bg)",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-muted)",
              letterSpacing: "0.1em",
              marginBottom: "8px",
            }}
          >
            03/20 FRI
          </div>
          <div
            style={{
              fontSize: "4rem",
              fontWeight: 200,
              color: "var(--color-accent)",
              letterSpacing: "0.05em",
            }}
          >
            13:00
          </div>
        </div>
      </CatalogItem>
    </div>
  );
}

function CatalogItem(
  { title, children }: { title: string; children: preact.ComponentChildren },
) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--color-text-muted)",
          marginBottom: "8px",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "4px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

render(<Catalog />, document.querySelector(".catalog")!);
