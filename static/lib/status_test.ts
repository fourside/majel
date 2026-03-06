import { assertEquals } from "jsr:@std/assert";
import { phaseLabels, phaseToLabel } from "./status.js";

Deno.test("phaseToLabel > known phase returns label", () => {
  assertEquals(phaseToLabel("listening"), "聞き取り中...");
});

Deno.test("phaseToLabel > done returns 待機中", () => {
  assertEquals(phaseToLabel("done"), "待機中");
});

Deno.test("phaseToLabel > unknown phase returns phase string", () => {
  assertEquals(phaseToLabel("unknown_phase"), "unknown_phase");
});

Deno.test("phaseLabels > has all 5 phases", () => {
  const keys = Object.keys(phaseLabels);
  assertEquals(keys.length, 5);
  assertEquals(keys.sort(), ["done", "listening", "speaking", "thinking", "transcribing"]);
});
