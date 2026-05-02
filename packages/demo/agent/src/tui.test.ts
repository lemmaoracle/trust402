/**
 * Unit tests for TUI pacing primitives.
 *
 * Tests typewriter delay calculation, character output ordering,
 * asyncSpinner frame cycling, and result passthrough.
 * Raw-mode stdin tests are skipped (require interactive terminal).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock process.stdout.write to capture output
const mockWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true as ReturnType<typeof process.stdout.write>);

beforeEach(() => {
  mockWrite.mockClear();
});

afterEach(() => {
  mockWrite.mockClear();
});

describe("typewriter", () => {
  it("should write each character sequentially with a newline at the end", async () => {
    const { typewriter } = await import("./tui.js");

    vi.useFakeTimers();

    const promise = typewriter("Hi", { delay: 10 });

    // Advance timers to let all characters write
    await vi.advanceTimersByTimeAsync(50);

    await promise;

    vi.useRealTimers();

    const writes = mockWrite.mock.calls.map((args: unknown[]) => args[0] as string);

    // Should contain "H", "i", and "\n" in order
    expect(writes).toContain("H");
    expect(writes).toContain("i");
    expect(writes).toContain("\n");

    const hIndex = writes.indexOf("H");
    const iIndex = writes.indexOf("i");
    const newlineIndex = writes.indexOf("\n");
    expect(hIndex).toBeLessThan(iIndex);
    expect(iIndex).toBeLessThan(newlineIndex);
  });

  it("should use default delay of 100ms when no options provided", async () => {
    const { typewriter } = await import("./tui.js");

    vi.useFakeTimers();

    const promise = typewriter("A");

    // After 50ms, only the first char should be written
    await vi.advanceTimersByTimeAsync(50);

    const writesSoFar = mockWrite.mock.calls.map((args: unknown[]) => args[0] as string);
    expect(writesSoFar).toContain("A");

    // Advance past 100ms to complete
    await vi.advanceTimersByTimeAsync(100);

    await promise;

    vi.useRealTimers();
  });
});

describe("asyncSpinner", () => {
  it("should pass through the resolved value from the operation", async () => {
    const { asyncSpinner } = await import("./tui.js");

    const result = await asyncSpinner("Testing", () => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it("should reject when the operation rejects", async () => {
    const { asyncSpinner } = await import("./tui.js");

    await expect(
      asyncSpinner("Failing", () => Promise.reject(new Error("boom"))),
    ).rejects.toThrow("boom");
  });

  it("should write spinner frames and then a success indicator", async () => {
    const { asyncSpinner } = await import("./tui.js");

    vi.useFakeTimers();

    const promise = asyncSpinner("Loading", async () => {
      await new Promise((r) => setTimeout(r, 200));
      return "done";
    });

    // Advance enough to trigger some spinner frames
    await vi.advanceTimersByTimeAsync(250);

    const result = await promise;
    expect(result).toBe("done");

    vi.useRealTimers();

    const writes = mockWrite.mock.calls.map((args: unknown[]) => args[0] as string);

    // Should have written at least one spinner frame
    const brailleChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const hasSpinnerFrame = writes.some((w: string) =>
      brailleChars.some((frame: string) => w.includes(frame)),
    );
    expect(hasSpinnerFrame).toBe(true);

    // Should end with a success line containing "✓"
    const hasSuccess = writes.some((w: string) => typeof w === "string" && w.includes("✓"));
    expect(hasSuccess).toBe(true);
  });
});
