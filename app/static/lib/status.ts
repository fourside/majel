export const phaseLabels: Record<string, string> = {
  listening: "ききとりちゅう...",
  transcribing: "もじおこしちゅう...",
  thinking: "かんがえちゅう...",
  speaking: "おうとうちゅう...",
  done: "たいきちゅう",
};

export function phaseToLabel(phase: string): string {
  return phaseLabels[phase] ?? phase;
}
