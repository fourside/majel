import { wmoCodeToIcon, formatTemperature } from "../lib/weather.js";

class MajelWeather extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <span class="weather-icon">--</span>
      <span class="weather-temp">--°C</span>`;
    this._iconEl = this.querySelector(".weather-icon");
    this._tempEl = this.querySelector(".weather-temp");
    this._fetch();
    this._timer = setInterval(() => this._fetch(), 10 * 60 * 1000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
  }

  async _fetch() {
    try {
      const res = await fetch("/api/weather");
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      this._iconEl.textContent = wmoCodeToIcon(data.weatherCode);
      this._tempEl.textContent = formatTemperature(data.temperature);
    } catch {
      this._iconEl.textContent = "--";
      this._tempEl.textContent = "--°C";
    }
  }
}

customElements.define("majel-weather", MajelWeather);
