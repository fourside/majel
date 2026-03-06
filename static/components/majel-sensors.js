import { formatSensorValue } from "../lib/format.js";
import { calculateBars } from "../lib/graph.js";

class MajelSensors extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="sensor-row">
        <div class="sensor-item">
          <span class="sensor-icon">🌡</span>
          <span class="sensor-value" data-key="temp">--°C</span>
        </div>
        <div class="sensor-item">
          <span class="sensor-icon">💧</span>
          <span class="sensor-value" data-key="humidity">--%</span>
        </div>
        <div class="sensor-item">
          <span class="sensor-icon">📊</span>
          <span class="sensor-value" data-key="pressure">--hPa</span>
        </div>
      </div>
      <div class="sensor-row">
        <div class="sensor-item">
          <span class="sensor-icon">💡</span>
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
