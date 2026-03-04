// ── DOM ──
const clockEl = document.getElementById("clock");
const weatherIconEl = document.getElementById("weather-icon");
const weatherTempEl = document.getElementById("weather-temp");
const co2ValueEl = document.getElementById("co2-value");
const co2GraphEl = document.getElementById("co2-graph");
const responseEl = document.getElementById("response");
const statusDot = document.getElementById("status-dot");
const statusLabel = document.getElementById("status-label");
const inputToggle = document.getElementById("input-toggle");
const inputPanel = document.getElementById("input-panel");
const form = document.getElementById("ask-form");
const input = document.getElementById("message");
const submitButton = form.querySelector("button");

// ── 1. 時計 ──
function updateClock() {
  const now = new Date();
  clockEl.textContent =
    String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0") + ":" +
    String(now.getSeconds()).padStart(2, "0");
}
updateClock();
setInterval(updateClock, 1000);

// ── 2. 天気 ──
const wmoIcons = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
  45: "🌫", 48: "🌫",
  51: "🌦", 53: "🌦", 55: "🌧",
  61: "🌧", 63: "🌧", 65: "🌧",
  71: "🌨", 73: "🌨", 75: "❄️",
  80: "🌦", 81: "🌧",
  95: "⛈", 96: "⛈", 99: "⛈",
};

async function fetchWeather() {
  try {
    const res = await fetch("/api/weather");
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    weatherIconEl.textContent = wmoIcons[data.weatherCode] ?? "🌡";
    weatherTempEl.textContent = Math.round(data.temperature) + "°C";
  } catch {
    weatherIconEl.textContent = "--";
    weatherTempEl.textContent = "--°C";
  }
}
fetchWeather();
setInterval(fetchWeather, 10 * 60 * 1000);

// ── 3. CO2 プレースホルダー ──
function renderCo2(value) {
  if (value == null) {
    co2ValueEl.textContent = "-- ppm";
    co2ValueEl.className = "co2-value";
  } else {
    co2ValueEl.textContent = value + " ppm";
    co2ValueEl.className = "co2-value" +
      (value >= 1500 ? " danger" : value >= 1000 ? " warning" : "");
  }
}

function renderCo2Graph(values) {
  co2GraphEl.innerHTML = "";
  const max = values ? Math.max(...values, 1) : 1;
  const bars = values ?? Array(24).fill(0);
  bars.forEach((v) => {
    const bar = document.createElement("div");
    bar.className = "bar" + (values ? "" : " dim");
    bar.style.height = (values ? (v / max) * 72 + 8 : 10) + "px";
    co2GraphEl.appendChild(bar);
  });
}

renderCo2(null);
renderCo2Graph(null);

// ── 4. WebSocket ──
const phaseLabels = {
  listening: "聞き取り中...",
  transcribing: "文字起こし中...",
  thinking: "考え中...",
  speaking: "応答中...",
  done: "待機中",
};

function setStatus(phase) {
  statusLabel.textContent = phaseLabels[phase] ?? phase;
  statusDot.className = "status-dot";
  if (phase === "done") {
    lastTranscription = "";
    return;
  }
  statusDot.classList.add("active", phase);
}

function showResponse(userText, assistantText) {
  responseEl.innerHTML = "";
  if (userText) {
    const u = document.createElement("div");
    u.className = "response-user";
    u.textContent = userText;
    responseEl.appendChild(u);
  }
  if (assistantText) {
    const a = document.createElement("div");
    a.className = "response-text";
    a.textContent = assistantText;
    responseEl.appendChild(a);
  }
}

let lastTranscription = "";
let wsRetryDelay = 1000;
const WS_RETRY_MAX = 60000;

function connectWs() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${location.host}/ws`);

  ws.onopen = () => {
    wsRetryDelay = 1000;
    setStatus("done");
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "status") {
      const { phase, transcription, response } = msg.data;
      setStatus(phase);
      if (transcription) {
        lastTranscription = transcription;
        showResponse(transcription, null);
      }
      if (response) {
        showResponse(lastTranscription, response);
      }
    }
  };

  ws.onclose = () => {
    statusLabel.textContent = "切断中...";
    statusDot.className = "status-dot disconnected";
    setTimeout(connectWs, wsRetryDelay);
    wsRetryDelay = Math.min(wsRetryDelay * 2, WS_RETRY_MAX);
  };

  ws.onerror = () => ws.close();
}

connectWs();

// ── 5. テキスト入力 ──
inputToggle.addEventListener("click", () => {
  inputPanel.classList.toggle("visible");
  if (inputPanel.classList.contains("visible")) input.focus();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  input.value = "";
  submitButton.disabled = true;

  showResponse(message, null);
  setStatus("thinking");

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.error) {
      showResponse(message, "エラー: " + data.error);
    } else {
      showResponse(message, data.response);
    }
  } catch (err) {
    showResponse(message, "エラー: " + err.message);
  } finally {
    setStatus("done");
    submitButton.disabled = false;
  }
});
