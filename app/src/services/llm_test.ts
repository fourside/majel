import { assertEquals } from "jsr:@std/assert";
import { clearHistory, _conversationHistory, _trimHistory } from "./llm.ts";

// ── trimHistory ──

Deno.test("trimHistory > does nothing when under max", () => {
  // Arrange
  const arr = [1, 2, 3];

  // Act
  _trimHistory(arr, 5);

  // Assert
  assertEquals(arr.length, 3);
  assertEquals(arr, [1, 2, 3]);
});

Deno.test("trimHistory > does nothing at exactly max", () => {
  // Arrange
  const arr = Array.from({ length: 20 }, (_, i) => i);

  // Act
  _trimHistory(arr, 20);

  // Assert
  assertEquals(arr.length, 20);
  assertEquals(arr[0], 0);
});

Deno.test("trimHistory > trims oldest when over max", () => {
  // Arrange
  const arr = Array.from({ length: 25 }, (_, i) => i);

  // Act
  _trimHistory(arr, 20);

  // Assert
  assertEquals(arr.length, 20);
  assertEquals(arr[0], 5);
  assertEquals(arr[19], 24);
});

Deno.test("trimHistory > trims to max when just one over", () => {
  // Arrange
  const arr = Array.from({ length: 21 }, (_, i) => i);

  // Act
  _trimHistory(arr, 20);

  // Assert
  assertEquals(arr.length, 20);
  assertEquals(arr[0], 1);
});

// ── clearHistory ──

Deno.test("clearHistory > empties conversation history", () => {
  // Arrange
  _conversationHistory.push({ role: "user", content: "test1" });
  _conversationHistory.push({ role: "assistant", content: "test2" });

  // Act
  clearHistory();

  // Assert
  assertEquals(_conversationHistory.length, 0);
});

Deno.test("clearHistory > is idempotent on empty history", () => {
  // Arrange — ensure empty
  clearHistory();

  // Act
  clearHistory();

  // Assert
  assertEquals(_conversationHistory.length, 0);
});
