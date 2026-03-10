import { assertEquals } from "@std/assert";
import { _evaluateSchedule, _isInRange, _timeToMinutes } from "./display.ts";

// ── timeToMinutes ──

Deno.test("timeToMinutes > 00:00 → 0", () => {
  assertEquals(_timeToMinutes("00:00"), 0);
});

Deno.test("timeToMinutes > 06:00 → 360", () => {
  assertEquals(_timeToMinutes("06:00"), 360);
});

Deno.test("timeToMinutes > 12:30 → 750", () => {
  assertEquals(_timeToMinutes("12:30"), 750);
});

Deno.test("timeToMinutes > 23:59 → 1439", () => {
  assertEquals(_timeToMinutes("23:59"), 1439);
});

// ── isInRange ──

Deno.test("isInRange > normal range: inside → true", () => {
  assertEquals(_isInRange(600, 360, 1320), true);
});

Deno.test("isInRange > normal range: outside → false", () => {
  assertEquals(_isInRange(100, 360, 1320), false);
});

Deno.test("isInRange > wrap-around range: midnight → true", () => {
  assertEquals(_isInRange(0, 1320, 360), true);
});

Deno.test("isInRange > wrap-around range: early morning → true", () => {
  assertEquals(_isInRange(180, 1320, 360), true);
});

Deno.test("isInRange > wrap-around range: daytime → false", () => {
  assertEquals(_isInRange(600, 1320, 360), false);
});

Deno.test("isInRange > boundary: start → true", () => {
  assertEquals(_isInRange(360, 360, 1320), true);
});

Deno.test("isInRange > boundary: end → false", () => {
  assertEquals(_isInRange(1320, 360, 1320), false);
});

// ── evaluateSchedule ──
// config: OFF 01:00-06:00, ON otherwise (brightness handled by auto-brightness)

Deno.test("evaluateSchedule > daytime 12:00 → power on", () => {
  assertEquals(_evaluateSchedule(720), { power: true });
});

Deno.test("evaluateSchedule > off period 03:00 → power off", () => {
  assertEquals(_evaluateSchedule(180), { power: false });
});

Deno.test("evaluateSchedule > evening 22:00 → power on", () => {
  assertEquals(_evaluateSchedule(1320), { power: true });
});

Deno.test("evaluateSchedule > late night 00:30 → power on", () => {
  assertEquals(_evaluateSchedule(30), { power: true });
});

// 境界テスト

Deno.test("evaluateSchedule > boundary 00:59 → ON", () => {
  assertEquals(_evaluateSchedule(59), { power: true });
});

Deno.test("evaluateSchedule > boundary 01:00 → OFF", () => {
  assertEquals(_evaluateSchedule(60), { power: false });
});

Deno.test("evaluateSchedule > boundary 05:59 → OFF", () => {
  assertEquals(_evaluateSchedule(359), { power: false });
});

Deno.test("evaluateSchedule > boundary 06:00 → ON", () => {
  assertEquals(_evaluateSchedule(360), { power: true });
});

Deno.test("evaluateSchedule > boundary 23:59 → ON", () => {
  assertEquals(_evaluateSchedule(1439), { power: true });
});

Deno.test("evaluateSchedule > boundary 00:00 → ON", () => {
  assertEquals(_evaluateSchedule(0), { power: true });
});
