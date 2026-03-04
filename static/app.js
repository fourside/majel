// ── DOM ──
const clockEl = document.getElementById("clock");
const weatherIconEl = document.getElementById("weather-icon");
const weatherTempEl = document.getElementById("weather-temp");
const sensorTempEl = document.getElementById("sensor-temp");
const sensorHumidityEl = document.getElementById("sensor-humidity");
const sensorPressureEl = document.getElementById("sensor-pressure");
const sensorLightEl = document.getElementById("sensor-light");
const lightGraphEl = document.getElementById("light-graph");
const responseEl = document.getElementById("response");
const statusDot = document.getElementById("status-dot");
const statusLabel = document.getElementById("status-label");
const inputToggle = document.getElementById("input-toggle");
const inputPanel = document.getElementById("input-panel");
const form = document.getElementById("ask-form");
const input = document.getElementById("message");
const submitButton = form.querySelector("button");
const micButton = document.getElementById("mic-button");

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

// ── 3. 環境センサー ──
function renderSensors(data) {
  if (!data || data.temperature === null) {
    sensorTempEl.textContent = "--°C";
    sensorHumidityEl.textContent = "--%";
    sensorPressureEl.textContent = "--hPa";
    sensorLightEl.textContent = "--lx";
    return;
  }
  sensorTempEl.textContent = data.temperature.toFixed(1) + "°C";
  sensorHumidityEl.textContent = Math.round(data.humidity) + "%";
  sensorPressureEl.textContent = Math.round(data.pressure) + "hPa";
  sensorLightEl.textContent = Math.round(data.light) + "lx";
}

function renderLightGraph(values) {
  lightGraphEl.innerHTML = "";
  const hasData = values && values.length > 0;
  const max = hasData ? Math.max(...values, 1) : 1;
  const bars = hasData ? values : Array(24).fill(0);
  bars.forEach((v) => {
    const bar = document.createElement("div");
    bar.className = "bar" + (hasData ? "" : " dim");
    bar.style.height = (hasData ? (v / max) * 32 + 8 : 6) + "px";
    lightGraphEl.appendChild(bar);
  });
}

renderSensors(null);
renderLightGraph(null);

// ── 4. WebSocket ──
const phaseLabels = {
  listening: "聞き取り中...",
  transcribing: "文字起こし中...",
  thinking: "考え中...",
  speaking: "応答中...",
  done: "待機中",
};

let thinkingDotsTimer = null;

function setStatus(phase) {
  // thinking dots cleanup
  if (thinkingDotsTimer) {
    clearInterval(thinkingDotsTimer);
    thinkingDotsTimer = null;
  }

  statusDot.className = "status-dot";
  if (phase === "done") {
    statusLabel.textContent = phaseLabels[phase];
    lastTranscription = "";
    return;
  }
  statusDot.classList.add("active", phase);

  if (phase === "thinking") {
    let dotCount = 0;
    const baseText = "考え中";
    statusLabel.textContent = baseText;
    thinkingDotsTimer = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      statusLabel.textContent = baseText + ".".repeat(dotCount);
    }, 500);
  } else {
    statusLabel.textContent = phaseLabels[phase] ?? phase;
  }
}

let typewriterTimer = null;

function showResponse(userText, assistantText) {
  if (typewriterTimer) {
    clearInterval(typewriterTimer);
    typewriterTimer = null;
  }

  responseEl.innerHTML = "";
  if (userText) {
    const u = document.createElement("div");
    u.className = "response-user";
    u.textContent = userText;
    responseEl.appendChild(u);
  }
  if (assistantText) {
    const a = document.createElement("div");
    a.className = "response-text typewriter";
    responseEl.appendChild(a);

    let i = 0;
    typewriterTimer = setInterval(() => {
      a.textContent = assistantText.slice(0, ++i);
      if (i >= assistantText.length) {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
        a.classList.remove("typewriter");
      }
    }, 30);
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
    if (msg.type === "sensors") {
      renderSensors(msg.data);
      renderLightGraph(msg.data.lightHistory);
    } else if (msg.type === "status") {
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

/** API レスポンスを共通処理して応答を表示 */
function displayApiResult(userText, data) {
  if (data.error) {
    showResponse(userText, "エラー: " + data.error);
  } else {
    showResponse(data.transcription ?? userText, data.response);
  }
}

// ── 5. テキスト入力 ──
inputToggle.addEventListener("click", () => {
  inputPanel.classList.toggle("visible");
  if (inputPanel.classList.contains("visible")) input.focus();
});

// ── 6. マイクボタン ──
micButton.addEventListener("click", async () => {
  if (micButton.disabled) return;
  micButton.disabled = true;
  micButton.classList.add("recording");

  try {
    const res = await fetch("/api/voice", { method: "POST" });
    displayApiResult("", await res.json());
  } catch (err) {
    showResponse("", "エラー: " + err.message);
  } finally {
    micButton.disabled = false;
    micButton.classList.remove("recording");
  }
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
    displayApiResult(message, await res.json());
  } catch (err) {
    showResponse(message, "エラー: " + err.message);
  } finally {
    setStatus("done");
    submitButton.disabled = false;
  }
});
