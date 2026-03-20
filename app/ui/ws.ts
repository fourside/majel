import {
  isDisconnected,
  lastTranscription,
  type Phase,
  responseError,
  responseText,
  type SensorData,
  sensorData,
  statusPhase,
  type TimerData,
  timerData,
} from "./signals.ts";

// ── Message types ──

interface SensorsMessage {
  type: "sensors";
  data: SensorData;
}

interface StatusMessage {
  type: "status";
  data: {
    phase: Phase;
    transcription?: string;
    response?: string;
  };
}

interface TimerMessage {
  type: "timer";
  data: TimerData;
}

type WsMessage = SensorsMessage | StatusMessage | TimerMessage;

// ── Type guards ──

const PHASES = new Set<string>([
  "listening",
  "transcribing",
  "thinking",
  "speaking",
  "done",
]);

function isPhase(value: unknown): value is Phase {
  return typeof value === "string" && PHASES.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWsMessage(raw: unknown): raw is WsMessage {
  if (!isRecord(raw) || typeof raw.type !== "string") return false;

  if (raw.type === "sensors") {
    return isRecord(raw.data);
  }
  if (raw.type === "status") {
    if (!isRecord(raw.data)) return false;
    return isPhase(raw.data.phase);
  }
  if (raw.type === "timer") {
    return isRecord(raw.data) && typeof raw.data.active === "boolean";
  }
  return false;
}

// ── Handlers ──

/** Parse and handle a WebSocket message, updating the relevant signals. */
export function handleWsMessage(raw: unknown): void {
  if (!isWsMessage(raw)) return;

  if (raw.type === "sensors") {
    sensorData.value = raw.data;
  } else if (raw.type === "timer") {
    timerData.value = raw.data;
  } else {
    const { phase, transcription, response } = raw.data;
    statusPhase.value = phase;

    if (transcription) {
      lastTranscription.value = transcription;
      responseText.value = null;
      responseError.value = null;
    }
    if (response) {
      responseText.value = response;
    }
  }
}

/** Called when the WebSocket connection opens successfully. */
export function handleWsOpen(): void {
  isDisconnected.value = false;
  statusPhase.value = "done";
}

/** Called when the WebSocket connection closes. */
export function handleWsClose(): void {
  isDisconnected.value = true;
}
