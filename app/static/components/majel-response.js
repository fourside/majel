export class MajelResponse extends HTMLElement {
  connectedCallback() {
    this._timer = null;
  }

  disconnectedCallback() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /** @param {string} userText */
  clear(userText) {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.innerHTML = "";
    if (userText) {
      const u = document.createElement("div");
      u.className = "response-user";
      u.textContent = userText;
      this.appendChild(u);
    }
  }

  /**
   * @param {string} userText
   * @param {string|null} assistantText
   */
  showResponse(userText, assistantText) {
    this.clear(userText);
    if (assistantText) {
      const a = document.createElement("div");
      a.className = "response-text typewriter";
      this.appendChild(a);

      let i = 0;
      this._timer = setInterval(() => {
        a.textContent = assistantText.slice(0, ++i);
        if (i >= assistantText.length) {
          clearInterval(this._timer);
          this._timer = null;
          a.classList.remove("typewriter");
        }
      }, 30);
    }
  }

  /**
   * @param {string} userText
   * @param {string} msg
   * @param {(() => void)} [retryFn]
   */
  showError(userText, msg, retryFn) {
    this.clear(userText);
    const e = document.createElement("div");
    e.className = "response-error";
    e.textContent = msg;
    this.appendChild(e);

    if (retryFn) {
      const btn = document.createElement("button");
      btn.className = "retry-button";
      btn.textContent = "もう一度試す";
      btn.addEventListener("click", retryFn);
      this.appendChild(btn);
    }
  }
}

customElements.define("majel-response", MajelResponse);
