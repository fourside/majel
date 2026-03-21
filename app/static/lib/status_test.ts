import { assertEquals } from "jsr:@std/assert";
import { phaseLabels, phaseToLabel } from "./status.ts";

Deno.test("phaseToLabel > known phase returns label", () => {
  assertEquals(phaseToLabel("listening"), "ききとりちゅう...");
});

Deno.test("phaseToLabel > done returns たいきちゅう", () => {
  assertEquals(phaseToLabel("done"), "たいきちゅう");
});

Deno.test("phaseToLabel > unknown phase returns phase string", () => {
  assertEquals(phaseToLabel("unknown_phase"), "unknown_phase");
});

Deno.test("phaseLabels > has all 5 phases", () => {
  const keys = Object.keys(phaseLabels);
  assertEquals(keys.length, 5);
  assertEquals(keys.sort(), ["done", "listening", "speaking", "thinking", "transcribing"]);
});
