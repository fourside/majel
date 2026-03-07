import { assertEquals } from "jsr:@std/assert";
import { wmoIcons, wmoCodeToIcon, formatTemperature } from "./weather.js";

// ── wmoCodeToIcon ──

Deno.test("wmoCodeToIcon > known code returns icon", () => {
  assertEquals(wmoCodeToIcon(0), wmoIcons[0]);
});

Deno.test("wmoCodeToIcon > thunderstorm code", () => {
  assertEquals(wmoCodeToIcon(95), wmoIcons[95]);
});

Deno.test("wmoCodeToIcon > unknown code returns thermometer", () => {
  assertEquals(wmoCodeToIcon(999), "🌡");
});

// ── formatTemperature ──

Deno.test("formatTemperature > rounds to integer", () => {
  assertEquals(formatTemperature(25.7), "26°C");
});

Deno.test("formatTemperature > negative temperature", () => {
  assertEquals(formatTemperature(-3.2), "-3°C");
});

Deno.test("formatTemperature > zero", () => {
  assertEquals(formatTemperature(0), "0°C");
});
