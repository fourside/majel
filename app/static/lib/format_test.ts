import { assertEquals } from "jsr:@std/assert";
import { formatSensorValue } from "./format.ts";

// ── formatSensorValue ──

Deno.test("formatSensorValue > null returns placeholder", () => {
  assertEquals(formatSensorValue(null, "°C"), "--°C");
});

Deno.test("formatSensorValue > undefined returns placeholder", () => {
  assertEquals(formatSensorValue(undefined, "%"), "--%");
});

Deno.test("formatSensorValue > integer with 0 decimals", () => {
  assertEquals(formatSensorValue(25, "°C"), "25°C");
});

Deno.test("formatSensorValue > float with 1 decimal", () => {
  assertEquals(formatSensorValue(25.34, "°C", 1), "25.3°C");
});

Deno.test("formatSensorValue > zero value is valid", () => {
  assertEquals(formatSensorValue(0, "lx"), "0lx");
});
