import { formatTime } from "../lib/format.js";

class MajelClock extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<div class="clock">--:--:--</div>`;
    this._el = this.firstElementChild;
    this._update();
    this._timer = setInterval(() => this._update(), 1000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
  }

  _update() {
    const now = new Date();
    this._el.textContent = formatTime(now.getHours(), now.getMinutes(), now.getSeconds());
  }
}

customElements.define("majel-clock", MajelClock);
