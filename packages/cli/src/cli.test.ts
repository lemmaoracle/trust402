import { describe, it, expect, vi } from "vitest";

// ── Mocks (must be before importing cli) ────────────────────────────────

vi.mock("@lemmaoracle/sdk", () => ({
  create: vi.fn().mockReturnValue({ apiKey: "test" }),
  prover: { prove: vi.fn().mockResolvedValue({ proof: "mock-proof", inputs: ["123", "456"] }) },
  proofs: { submit: vi.fn().mockResolvedValue({ txHash: "0xabc", status: "submitted" }) },
}));

vi.mock("@lemmaoracle/agent", () => ({
  commit: vi.fn().mockResolvedValue({
    root: "mock-root",
    sectionHashes: {},
    salt: "0x01",
    normalized: {},
  }),
  computeCredentialCommitment: vi.fn(),
  credential: vi.fn().mockReturnValue({ valid: true, credential: { schema: "test" } }),
  validate: vi.fn().mockReturnValue({ valid: true, credential: { schema: "test" } }),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(
    JSON.stringify({
      schema: "agent-identity-authority-v1",
      identity: { agentId: "test", subjectId: "test", controllerId: "test", orgId: "test" },
      authority: { roles: [{ name: "purchaser" }], scopes: [], permissions: [] },
      financial: { spendLimit: 50000, currency: "USD", paymentPolicy: "auto" },
      lifecycle: { issuedAt: 1745900000, expiresAt: 1777436000, revoked: false, revocationRef: "" },
      provenance: { issuerId: "test", sourceSystem: "", generatorId: "", chainContext: { chainId: 1, network: "mainnet" } },
    }),
  ),
}));

import { program } from "./cli.js";

// ── Tests ─────────────────────────────────────────────────────────────

describe("CLI program", () => {
  it("has the correct name", () => {
    expect(program.name()).toBe("trust402");
  });

  it("has create command", () => {
    const cmd = program.commands.find((c) => c.name() === "create");
    expect(cmd).toBeDefined();
  });

  it("has validate command", () => {
    const cmd = program.commands.find((c) => c.name() === "validate");
    expect(cmd).toBeDefined();
  });

  it("has prove command (agent-identity-v1)", () => {
    const cmd = program.commands.find((c) => c.name() === "prove");
    expect(cmd).toBeDefined();
    expect(cmd?.description()).toContain("agent-identity-v1");
  });

  it("prove command requires --credential and --api-key", () => {
    const cmd = program.commands.find((c) => c.name() === "prove");
    const opts = cmd?.options ?? [];
    expect(opts.some((o) => o.long === "--credential")).toBe(true);
    expect(opts.some((o) => o.long === "--api-key")).toBe(true);
  });

  it("does not have witness or role-prove commands", () => {
    expect(program.commands.find((c) => c.name() === "witness")).toBeUndefined();
    expect(program.commands.find((c) => c.name() === "role-prove")).toBeUndefined();
  });
});
