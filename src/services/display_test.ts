import { assertEquals } from "jsr:@std/assert";
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
  // Arrange
  const start = 360;
  const end = 1320;

  // Act & Assert
  assertEquals(_isInRange(600, start, end), true);
});

Deno.test("isInRange > normal range: outside → false", () => {
  // Arrange
  const start = 360;
  const end = 1320;

  // Act & Assert
  assertEquals(_isInRange(100, start, end), false);
});

Deno.test("isInRange > wrap-around range: midnight → true", () => {
  // Arrange
  const start = 1320;
  const end = 360;

  // Act & Assert
  assertEquals(_isInRange(0, start, end), true);
});

Deno.test("isInRange > wrap-around range: early morning → true", () => {
  // Arrange
  const start = 1320;
  const end = 360;

  // Act & Assert
  assertEquals(_isInRange(180, start, end), true);
});

Deno.test("isInRange > wrap-around range: daytime → false", () => {
  // Arrange
  const start = 1320;
  const end = 360;

  // Act & Assert
  assertEquals(_isInRange(600, start, end), false);
});

Deno.test("isInRange > boundary: start → true", () => {
  assertEquals(_isInRange(360, 360, 1320), true);
});

Deno.test("isInRange > boundary: end → false", () => {
  assertEquals(_isInRange(1320, 360, 1320), false);
});

// ── evaluateSchedule ──
// config: OFF 0:00-6:00, DAY 6:00-22:00, NIGHT 22:00-0:00

Deno.test("evaluateSchedule > daytime 06:00 → power on, brightness 80", () => {
  // Arrange
  const nowMinutes = 360; // 06:00

  // Act
  const result = _evaluateSchedule(nowMinutes);

  // Assert
  assertEquals(result, { power: true, brightness: 80 });
});

Deno.test("evaluateSchedule > night 23:00 → power on, brightness 30", () => {
  // Arrange
  const nowMinutes = 1380; // 23:00

  // Act
  const result = _evaluateSchedule(nowMinutes);

  // Assert
  assertEquals(result, { power: true, brightness: 30 });
});

Deno.test("evaluateSchedule > off 03:00 → power off, brightness 0", () => {
  // Arrange
  const nowMinutes = 180; // 03:00

  // Act
  const result = _evaluateSchedule(nowMinutes);

  // Assert
  assertEquals(result, { power: false, brightness: 0 });
});

// 境界テスト

Deno.test("evaluateSchedule > boundary 05:59 → OFF", () => {
  assertEquals(_evaluateSchedule(359), { power: false, brightness: 0 });
});

Deno.test("evaluateSchedule > boundary 06:00 → DAY", () => {
  assertEquals(_evaluateSchedule(360), { power: true, brightness: 80 });
});

Deno.test("evaluateSchedule > boundary 21:59 → DAY", () => {
  assertEquals(_evaluateSchedule(1319), { power: true, brightness: 80 });
});

Deno.test("evaluateSchedule > boundary 22:00 → NIGHT", () => {
  assertEquals(_evaluateSchedule(1320), { power: true, brightness: 30 });
});

Deno.test("evaluateSchedule > boundary 23:59 → NIGHT", () => {
  assertEquals(_evaluateSchedule(1439), { power: true, brightness: 30 });
});

Deno.test("evaluateSchedule > boundary 00:00 → OFF", () => {
  assertEquals(_evaluateSchedule(0), { power: false, brightness: 0 });
});
