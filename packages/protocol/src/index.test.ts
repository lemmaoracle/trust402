import { describe, it, expect } from "vitest";

describe("@trust402/protocol exports", () => {
  it("exports wrapFetchWithProof as a function", async () => {
    const mod = await import("./index.js");
    expect(typeof mod.wrapFetchWithProof).toBe("function");
  });

  it("exports proveAndSubmit as a function", async () => {
    const mod = await import("./index.js");
    expect(typeof mod.proveAndSubmit).toBe("function");
  });

  it("exports ProveAndSubmitResult type (verifiable via type inference)", async () => {
    const mod = await import("./index.js");
    // Type re-export is compile-time; we verify the module loaded without error
    expect(mod).toBeTruthy();
  });

  it("exports PaymentGate type from @trust402/roles (verifiable via type inference)", async () => {
    const mod = await import("./index.js");
    // Type re-export is compile-time; we verify the module loaded without error
    expect(mod).toBeTruthy();
  });
});
