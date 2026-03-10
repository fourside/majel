import { assertEquals } from "@std/assert";
import { executeTool, toolDefinitions } from "./definitions.ts";

// ── toolDefinitions structure ──

Deno.test("toolDefinitions > all tools have type, name, and description", () => {
  for (const tool of toolDefinitions) {
    assertEquals(tool.type, "function");
    assertEquals(typeof tool.function.name, "string");
    assertEquals(typeof tool.function.description, "string");
  }
});

Deno.test("toolDefinitions > contains all expected tool names", () => {
  // Arrange
  const names = toolDefinitions.map((t) => t.function.name);
  const expected = [
    "get_weather",
    "get_current_time",
    "get_environment",
    "set_display_brightness",
    "set_display_power",
  ];

  // Assert
  for (const name of expected) {
    assertEquals(names.includes(name), true, `Missing tool: ${name}`);
  }
});

// ── executeTool ──

Deno.test("executeTool > unknown tool returns error", async () => {
  // Act
  const result = await executeTool("nonexistent_tool", {});

  // Assert
  const parsed = JSON.parse(result);
  assertEquals(parsed.error, "Unknown tool: nonexistent_tool");
});

Deno.test("executeTool > get_current_time returns datetime string", async () => {
  // Act
  const result = await executeTool("get_current_time", {});

  // Assert
  const parsed = JSON.parse(result);
  assertEquals(typeof parsed.datetime, "string");
});

Deno.test("executeTool > set_display_brightness returns ok", async () => {
  // Act
  const result = await executeTool("set_display_brightness", { value: 50 });

  // Assert
  assertEquals(JSON.parse(result), { ok: true, brightness: 50 });
});

Deno.test("executeTool > set_display_power returns ok", async () => {
  // Act
  const result = await executeTool("set_display_power", { on: false });

  // Assert
  assertEquals(JSON.parse(result), { ok: true, power: false });
});

Deno.test("executeTool > get_environment returns error when no sensor data", async () => {
  // Act (no sensor data has been polled)
  const result = await executeTool("get_environment", {});

  // Assert
  const parsed = JSON.parse(result);
  assertEquals(parsed.error, "環境センサーのデータが取得できませんでした。");
});
