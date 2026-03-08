import { formatSensorValue } from "../lib/format.js";
import { calculateBars } from "../lib/graph.js";

const ICON_TEMP = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f44336" stroke-width="1.8" stroke-linecap="round">
  <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
  <circle cx="11.5" cy="17.5" r="1.5" fill="#f44336"/>
</svg>`;

const ICON_HUMIDITY = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#4fc3f7" stroke-width="1.8" stroke-linecap="round">
  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  <path d="M8 14a4 4 0 0 0 4 4" stroke="#4fc3f7" stroke-width="1.2" opacity="0.5"/>
</svg>`;

const ICON_PRESSURE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#aaa" stroke-width="1.8" stroke-linecap="round">
  <circle cx="12" cy="12" r="9"/>
  <path d="M12 7v5l3 3"/>
  <circle cx="12" cy="12" r="1" fill="#aaa"/>
</svg>`;

const ICON_LIGHT = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fdd835" stroke-width="1.8" stroke-linecap="round">
  <circle cx="12" cy="12" r="4"/>
  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
</svg>`;

class MajelSensors extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="sensor-row">
        <div class="sensor-item">
          <span class="sensor-icon">${ICON_TEMP}</span>
          <span class="sensor-value" data-key="temp">--°C</span>
        </div>
        <div class="sensor-item">
          <span class="sensor-icon">${ICON_HUMIDITY}</span>
          <span class="sensor-value" data-key="humidity">--%</span>
        </div>
        <div class="sensor-item">
          <span class="sensor-icon">${ICON_PRESSURE}</span>
          <span class="sensor-value" data-key="pressure">--hPa</span>
        </div>
      </div>
      <div class="sensor-row">
        <div class="sensor-item">
          <span class="sensor-icon">${ICON_LIGHT}</span>
          <span class="sensor-value" data-key="light">--lx</span>
        </div>
        <div class="light-graph"></div>
      </div>`;

    this._tempEl = this.querySelector('[data-key="temp"]');
    this._humidityEl = this.querySelector('[data-key="humidity"]');
    this._pressureEl = this.querySelector('[data-key="pressure"]');
    this._lightEl = this.querySelector('[data-key="light"]');
    this._graphEl = this.querySelector(".light-graph");

    this._renderGraph(null);

    this._handler = (e) => this.update(e.detail);
    document.addEventListener("majel:sensors", this._handler);
  }

  disconnectedCallback() {
    document.removeEventListener("majel:sensors", this._handler);
  }

  /** @param {{ temperature?: number, humidity?: number, pressure?: number, light?: number, lightHistory?: number[] } | null} data */
  update(data) {
    const t = data?.temperature ?? null;
    this._tempEl.textContent = formatSensorValue(t, "°C", 1);
    this._humidityEl.textContent = formatSensorValue(data?.humidity ?? null, "%");
    this._pressureEl.textContent = formatSensorValue(data?.pressure ?? null, "hPa");
    this._lightEl.textContent = formatSensorValue(data?.light ?? null, "lx");
    this._renderGraph(data?.lightHistory ?? null);
  }

  _renderGraph(values) {
    const bars = calculateBars(values);
    const frag = document.createDocumentFragment();
    for (const { height, dim } of bars) {
      const bar = document.createElement("div");
      bar.className = "bar" + (dim ? " dim" : "");
      bar.style.height = height + "px";
      frag.appendChild(bar);
    }
    this._graphEl.replaceChildren(frag);
  }
}

customElements.define("majel-sensors", MajelSensors);
