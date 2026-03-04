import { assertEquals } from "jsr:@std/assert";
import { _weatherLabels } from "./weather.ts";

// ── weatherLabels ──

Deno.test("weatherLabels > 0 → 快晴", () => {
  assertEquals(_weatherLabels[0], "快晴");
});

Deno.test("weatherLabels > 65 → 強い雨", () => {
  assertEquals(_weatherLabels[65], "強い雨");
});

Deno.test("weatherLabels > 95 → 雷雨", () => {
  assertEquals(_weatherLabels[95], "雷雨");
});

Deno.test("weatherLabels > undefined code → undefined", () => {
  assertEquals(_weatherLabels[999], undefined);
});
