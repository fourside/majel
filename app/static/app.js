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

// ── WebSocket ──
let lastTranscription = "";
let wsRetryDelay = 1000;
const WS_RETRY_MAX = 60000;
let wsConnectedOnce = false;

function connectWs() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${location.host}/ws`);

  ws.onopen = () => {
    if (wsConnectedOnce) {
      location.reload();
      return;
    }
    wsConnectedOnce = true;
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

