import { signal } from "@preact/signals";

export type Phase =
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "done";

export interface SensorData {
  temperature?: number;
  humidity?: number;
  pressure?: number;
  light?: number;
  lightHistory?: number[];
}

export const statusPhase = signal<Phase>("done");
export const isDisconnected = signal(false);
export const sensorData = signal<SensorData | null>(null);
export const lastTranscription = signal("");
export const responseText = signal<string | null>(null);
export const responseError = signal<string | null>(null);

export function resetSignals(): void {
  statusPhase.value = "done";
  isDisconnected.value = false;
  sensorData.value = null;
  lastTranscription.value = "";
  responseText.value = null;
  responseError.value = null;
}
