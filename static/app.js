import "./components/majel-clock.js";
import "./components/majel-weather.js";
import "./components/majel-sensors.js";
import "./components/majel-response.js";
import "./components/majel-status.js";

// ── DOM refs ──
/** @type {import("./components/majel-response.js").MajelResponse} */
const responseEl = document.querySelector("majel-response");
/** @type {import("./components/majel-status.js").MajelStatus} */
const statusEl = document.querySelector("majel-status");
const micButton = document.getElementById("mic-button");
const inputToggle = document.getElementById("input-toggle");
const inputPanel = document.getElementById("input-panel");
const form = document.getElementById("ask-form");
const input = document.getElementById("message");
const submitButton = form.querySelector("button");

// ── WebSocket ──
let lastTranscription = "";
let wsRetryDelay = 1000;
const WS_RETRY_MAX = 60000;

function connectWs() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${location.host}/ws`);

  ws.onopen = () => {
    wsRetryDelay = 1000;
    statusEl.setStatus("done");
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "sensors") {
      document.dispatchEvent(new CustomEvent("majel:sensors", { detail: msg.data }));
    } else if (msg.type === "status") {
      const { phase, transcription, response } = msg.data;
      statusEl.setStatus(phase);
      if (transcription) {
        lastTranscription = transcription;
        responseEl.showResponse(transcription, null);
      }
      if (response) {
        responseEl.showResponse(lastTranscription, response);
      }
      if (phase === "done") lastTranscription = "";
    }
  };

  ws.onclose = () => {
    statusEl.setDisconnected();
    setTimeout(connectWs, wsRetryDelay);
    wsRetryDelay = Math.min(wsRetryDelay * 2, WS_RETRY_MAX);
  };

  ws.onerror = () => ws.close();
}

connectWs();

// ── API helpers ──
const MSG_CONNECTION_ERROR = "接続に問題があるようです";

function displayApiResult(userText, data, retryFn) {
  if (data.error) {
    responseEl.showError(userText, data.error, retryFn);
  } else {
    responseEl.showResponse(data.transcription ?? userText, data.response);
  }
}

// ── マイクボタン ──
async function doVoice() {
  if (micButton.disabled) return;
  micButton.disabled = true;
  micButton.classList.add("recording");

  try {
    const res = await fetch("/api/voice", { method: "POST" });
    displayApiResult("", await res.json(), doVoice);
  } catch {
    responseEl.showError("", MSG_CONNECTION_ERROR, doVoice);
  } finally {
    micButton.disabled = false;
    micButton.classList.remove("recording");
  }
}

micButton.addEventListener("click", doVoice);

// ── テキスト入力 ──
async function doAsk(message) {
  submitButton.disabled = true;
  responseEl.showResponse(message, null);
  statusEl.setStatus("thinking");

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    displayApiResult(message, await res.json(), () => doAsk(message));
  } catch {
    responseEl.showError(message, MSG_CONNECTION_ERROR, () => doAsk(message));
  } finally {
    statusEl.setStatus("done");
    submitButton.disabled = false;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  input.value = "";
  doAsk(message);
});

// ── Dev mode toggle ──
const devMode = new URLSearchParams(location.search).has("dev");

if (devMode) {
  inputToggle.style.display = "grid";
  inputPanel.classList.add("visible");
} else {
  inputToggle.style.display = "none";
}

inputToggle.addEventListener("click", () => {
  inputPanel.classList.toggle("visible");
  if (inputPanel.classList.contains("visible")) input.focus();
});
