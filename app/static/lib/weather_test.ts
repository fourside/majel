import { assertEquals } from "jsr:@std/assert";
import { wmoCodeToIcon, formatTemperature } from "./weather.ts";

// ── wmoCodeToIcon ──

Deno.test("wmoCodeToIcon > known code returns image path", () => {
  assertEquals(wmoCodeToIcon(0), "/images/weather/sunny.gif");
});

Deno.test("wmoCodeToIcon > thunderstorm code", () => {
  assertEquals(wmoCodeToIcon(95), "/images/weather/thunder.gif");
});

Deno.test("wmoCodeToIcon > unknown code returns unknown", () => {
  assertEquals(wmoCodeToIcon(999), "/images/weather/cloudy.gif");
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
