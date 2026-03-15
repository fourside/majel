import { assertEquals } from "@std/assert";
import { handleWsClose, handleWsMessage, handleWsOpen } from "./ws.ts";
import {
  isDisconnected,
  lastTranscription,
  resetSignals,
  responseError,
  responseText,
  sensorData,
  statusPhase,
} from "./signals.ts";

function setup() {
  resetSignals();
}

Deno.test("handleWsMessage > sensors message updates sensorData", () => {
  setup();
  const data = { temperature: 22.5, humidity: 60 };
  handleWsMessage({ type: "sensors", data });
  assertEquals(sensorData.value, data);
});

Deno.test("handleWsMessage > status message updates phase", () => {
  setup();
  handleWsMessage({ type: "status", data: { phase: "thinking" } });
  assertEquals(statusPhase.value, "thinking");
});

Deno.test("handleWsMessage > status with transcription updates signals", () => {
  setup();
  handleWsMessage({
    type: "status",
    data: { phase: "transcribing", transcription: "hello" },
  });
  assertEquals(lastTranscription.value, "hello");
  assertEquals(responseText.value, null);
});

Deno.test("handleWsMessage > status with response updates responseText", () => {
  setup();
  handleWsMessage({
    type: "status",
    data: { phase: "speaking", response: "world" },
  });
  assertEquals(responseText.value, "world");
});

Deno.test("handleWsMessage > done phase keeps lastTranscription", () => {
  setup();
  lastTranscription.value = "hello";
  handleWsMessage({ type: "status", data: { phase: "done" } });
  assertEquals(lastTranscription.value, "hello");
  assertEquals(statusPhase.value, "done");
});

Deno.test("handleWsMessage > invalid message is ignored", () => {
  setup();
  handleWsMessage(null);
  handleWsMessage("not an object");
  handleWsMessage({ type: "unknown" });
  assertEquals(statusPhase.value, "done");
  assertEquals(sensorData.value, null);
});

Deno.test("handleWsOpen > sets connected state", () => {
  setup();
  isDisconnected.value = true;
  statusPhase.value = "thinking";
  handleWsOpen();
  assertEquals(isDisconnected.value, false);
  assertEquals(statusPhase.value, "done");
});

Deno.test("handleWsClose > sets disconnected", () => {
  setup();
  handleWsClose();
  assertEquals(isDisconnected.value, true);
});

Deno.test("handleWsMessage > transcription clears previous response", () => {
  setup();
  responseText.value = "old response";
  responseError.value = "old error";
  handleWsMessage({
    type: "status",
    data: { phase: "transcribing", transcription: "new question" },
  });
  assertEquals(responseText.value, null);
  assertEquals(responseError.value, null);
});
