const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const form = document.getElementById("ask-form");
const input = document.getElementById("message");

function addLogEntry(text, type = "system") {
  const entry = document.createElement("div");
  entry.className = `entry ${type}`;
  entry.textContent = text;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

// WebSocket 接続
function connectWs() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${location.host}/ws`);

  ws.onopen = () => {
    statusEl.textContent = "接続中";
    statusEl.className = "status connected";
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    addLogEntry(`[${msg.type}] ${JSON.stringify(msg.data)}`, "system");
  };

  ws.onclose = () => {
    statusEl.textContent = "切断中";
    statusEl.className = "status disconnected";
    // 再接続
    setTimeout(connectWs, 3000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

connectWs();

// フォーム送信
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  input.value = "";
  const button = form.querySelector("button");
  button.disabled = true;

  addLogEntry(message, "user");

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.error) {
      addLogEntry(`Error: ${data.error}`, "system");
    } else {
      addLogEntry(data.response, "assistant");
    }
  } catch (err) {
    addLogEntry(`Error: ${err.message}`, "system");
  } finally {
    button.disabled = false;
    input.focus();
  }
});
