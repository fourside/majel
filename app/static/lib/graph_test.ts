import { assertEquals } from "jsr:@std/assert";
import { calculateBars } from "./graph.ts";

Deno.test("calculateBars > null returns 24 dim bars", () => {
  const bars = calculateBars(null);
  assertEquals(bars.length, 24);
  assertEquals(bars[0].dim, true);
  assertEquals(bars[0].height, 6);
});

Deno.test("calculateBars > empty array returns 24 dim bars", () => {
  const bars = calculateBars([]);
  assertEquals(bars.length, 24);
  assertEquals(bars[0].dim, true);
});

Deno.test("calculateBars > single value scales to max + min", () => {
  const bars = calculateBars([100]);
  assertEquals(bars.length, 1);
  assertEquals(bars[0].dim, false);
  assertEquals(bars[0].height, 32 + 8); // maxHeight + minHeight
});

Deno.test("calculateBars > zero value gets minHeight", () => {
  const bars = calculateBars([0, 100]);
  assertEquals(bars[0].height, 8); // 0/100 * 32 + 8
  assertEquals(bars[1].height, 40); // 100/100 * 32 + 8
});

Deno.test("calculateBars > custom dimensions", () => {
  const bars = calculateBars([50, 100], 20, 4, 3);
  assertEquals(bars[0].height, 14); // 50/100 * 20 + 4
  assertEquals(bars[1].height, 24); // 100/100 * 20 + 4
});

Deno.test("calculateBars > all zeros uses minimum of 1 for max", () => {
  const bars = calculateBars([0, 0, 0]);
  assertEquals(bars.length, 3);
  assertEquals(bars[0].dim, false);
  assertEquals(bars[0].height, 8); // 0/1 * 32 + 8
});
