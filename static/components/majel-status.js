import { phaseToLabel } from "../lib/status.js";

export class MajelStatus extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="status-dot"></div>
      <span class="status-label">起動中...</span>`;
    this._dot = this.querySelector(".status-dot");
    this._label = this.querySelector(".status-label");
    this._timer = null;
  }

  disconnectedCallback() {
    if (this._timer) clearInterval(this._timer);
  }

  /** @param {"listening"|"transcribing"|"thinking"|"speaking"|"done"} phase */
  setStatus(phase) {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }

    this._dot.className = "status-dot";
    if (phase === "done") {
      this._label.textContent = phaseToLabel(phase);
      return;
    }
    this._dot.classList.add("active", phase);

    if (phase === "thinking") {
      let dotCount = 0;
      const baseText = phaseToLabel(phase).replace(/\.+$/, "");
      this._label.textContent = baseText;
      this._timer = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        this._label.textContent = baseText + ".".repeat(dotCount);
      }, 500);
    } else {
      this._label.textContent = phaseToLabel(phase);
    }
  }

  setDisconnected() {
    this._label.textContent = "切断中...";
    this._dot.className = "status-dot disconnected";
  }
}

customElements.define("majel-status", MajelStatus);
