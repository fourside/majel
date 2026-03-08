class MajelClock extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="clock">
        <span class="clock-digit"></span>
        <span class="clock-digit"></span>
        <span class="clock-sep">:</span>
        <span class="clock-digit"></span>
        <span class="clock-digit"></span>
      </div>`;
    this._digits = this.querySelectorAll(".clock-digit");
    this._prev = ["", "", "", ""];
    this._update();
    this._timer = setInterval(() => this._update(), 1000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
  }

  _update() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const values = [h[0], h[1], m[0], m[1]];

    for (let i = 0; i < 4; i++) {
      if (values[i] === this._prev[i]) continue;
      const el = this._digits[i];
      el.textContent = values[i];
      el.classList.add("flip");
      el.addEventListener("animationend", () => el.classList.remove("flip"), { once: true });
    }

    this._prev = values;
  }
}

customElements.define("majel-clock", MajelClock);
