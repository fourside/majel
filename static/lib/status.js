export const phaseLabels = {
  listening: "聞き取り中...",
  transcribing: "文字起こし中...",
  thinking: "考え中...",
  speaking: "応答中...",
  done: "待機中",
};

/** @param {string} phase */
export function phaseToLabel(phase) {
  return phaseLabels[phase] ?? phase;
}
