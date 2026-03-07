import { assertEquals } from "jsr:@std/assert";
import { _validateReading, _addToLightHistory } from "./sensors.ts";

// ── validateReading ──

Deno.test("validateReading > valid data returns reading", () => {
  // Arrange
  const data = {
    temperature: 25.0,
    humidity: 60,
    pressure: 1013.25,
    light: 500,
    timestamp: "2025-01-01T00:00:00Z",
  };

  // Act
  const result = _validateReading(data);

  // Assert
  assertEquals(result?.temperature, 25.0);
  assertEquals(result?.humidity, 60);
  assertEquals(result?.pressure, 1013.25);
  assertEquals(result?.light, 500);
});

Deno.test("validateReading > with optional co2 returns reading", () => {
  // Arrange
  const data = {
    temperature: 25.0,
    humidity: 60,
    pressure: 1013.25,
    light: 500,
    co2: 823,
    timestamp: "2025-01-01T00:00:00Z",
  };

  // Act
  const result = _validateReading(data);

  // Assert
  assertEquals(result?.co2, 823);
});

Deno.test("validateReading > missing temperature → null", () => {
  const data = {
    humidity: 60,
    pressure: 1013.25,
    light: 500,
    timestamp: "2025-01-01T00:00:00Z",
  };
  assertEquals(_validateReading(data), null);
});

Deno.test("validateReading > missing humidity → null", () => {
  const data = {
    temperature: 25.0,
    pressure: 1013.25,
    light: 500,
    timestamp: "2025-01-01T00:00:00Z",
  };
  assertEquals(_validateReading(data), null);
});

Deno.test("validateReading > missing timestamp → null", () => {
  const data = {
    temperature: 25.0,
    humidity: 60,
    pressure: 1013.25,
    light: 500,
  };
  assertEquals(_validateReading(data), null);
});

Deno.test("validateReading > string value in numeric field → null", () => {
  const data = {
    temperature: "25.0",
    humidity: 60,
    pressure: 1013.25,
    light: 500,
    timestamp: "2025-01-01T00:00:00Z",
  };
  assertEquals(_validateReading(data), null);
});

Deno.test("validateReading > empty object → null", () => {
  assertEquals(_validateReading({}), null);
});

// ── addToLightHistory ──

Deno.test("addToLightHistory > adds value to empty history", () => {
  // Arrange
  const history: number[] = [];

  // Act
  _addToLightHistory(history, 100, 120);

  // Assert
  assertEquals(history, [100]);
});

Deno.test("addToLightHistory > does not trim when under max", () => {
  // Arrange
  const history = [100, 200, 300];

  // Act
  _addToLightHistory(history, 400, 120);

  // Assert
  assertEquals(history, [100, 200, 300, 400]);
});

Deno.test("addToLightHistory > trims oldest when exceeding max", () => {
  // Arrange
  const history = Array.from({ length: 120 }, (_, i) => i);

  // Act
  _addToLightHistory(history, 999, 120);

  // Assert
  assertEquals(history.length, 120);
  assertEquals(history[0], 1);
  assertEquals(history[119], 999);
});
