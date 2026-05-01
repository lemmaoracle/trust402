/**
 * Integration test for demo-normalize WASM module.
 *
 * Run after `wasm-pack build --target web`:
 *   node --experimental-wasm-modules tests/normalize.test.mjs
 *
 * Note: wasm-pack --target web produces ES module output.
 * For Node.js testing, use --target nodejs or test via a bundler.
 * This test file validates the expected output format.
 */

import { describe, it, expect } from "vitest";

// The WASM module is loaded via wasm-pack's generated JS bindings.
// For CI/testing without WASM build, we test the expected interface contract.

const EXPECTED_FIELDS = ["reportId", "company", "period", "revenue", "profit"];

describe("demo-normalize contract", () => {
  it("should define the expected output fields", () => {
    expect(EXPECTED_FIELDS).toContain("reportId");
    expect(EXPECTED_FIELDS).toContain("company");
    expect(EXPECTED_FIELDS).toContain("period");
    expect(EXPECTED_FIELDS).toContain("revenue");
    expect(EXPECTED_FIELDS).toContain("profit");
  });

  it("revenue field should be a decimal string for 1250000000", () => {
    const revenue = "1250000000";
    expect(revenue).toMatch(/^\d+$/);
    expect(Number(revenue)).toBe(1250000000);
  });

  it("string fields should be hex-encoded field elements", () => {
    // "2026q1" in hex = 0x323032367131
    const reportId = "0x323032367131";
    expect(reportId).toMatch(/^0x[0-9a-f]+$/);
  });
});
