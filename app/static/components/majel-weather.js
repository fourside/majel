import { wmoCodeToIcon, formatTemperature } from "../lib/weather.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

class MajelWeather extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="weather-date"></div>
      <div class="weather-info">
        <img class="weather-icon" src="" alt="" width="48" height="48">
        <span class="weather-temp">--°C</span>
      </div>`;
    this._dateEl = this.querySelector(".weather-date");
    this._iconEl = this.querySelector(".weather-icon");
    this._tempEl = this.querySelector(".weather-temp");
    this._updateDate();
    this._dateTimer = setInterval(() => this._updateDate(), 60 * 1000);
    this._fetch();
    this._timer = setInterval(() => this._fetch(), 10 * 60 * 1000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
    clearInterval(this._dateTimer);
  }

  _updateDate() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekday = WEEKDAYS[now.getDay()];
    this._dateEl.textContent = `${month} / ${day} ${weekday}`;
  }

  async _fetch() {
    try {
      const res = await fetch("/api/weather");
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const iconSrc = wmoCodeToIcon(data.weatherCode);
      this._iconEl.src = iconSrc;
      this._iconEl.alt = `weather-${data.weatherCode}`;
      this._tempEl.textContent = formatTemperature(data.temperature);
    } catch {
      this._iconEl.src = "";
      this._iconEl.alt = "--";
      this._tempEl.textContent = "--°C";
    }
  }
}

customElements.define("majel-weather", MajelWeather);
