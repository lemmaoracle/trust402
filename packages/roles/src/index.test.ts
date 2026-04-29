import { describe, it, expect } from "vitest";
import { witness, connect, prove, submit } from "./index.js";
import type { AgentCredential, PaymentGate, CircuitWitness } from "./index.js";

const sampleCred: AgentCredential = {
  schema: "agent-identity-authority-v1",
  identity: {
    agentId: "agent-0xabc123",
    subjectId: "did:lemma:agent:0xabc123",
    controllerId: "did:lemma:org:acme",
    orgId: "acme",
  },
  authority: {
    roles: ["purchaser", "viewer"],
    scopes: ["procurement", "reporting"],
    permissions: [
      { resource: "payments", action: "create" },
      { resource: "reports", action: "read" },
    ],
  },
  financial: {
    spendLimit: 50000,
    currency: "USD",
    paymentPolicy: "auto-approve-below-limit",
  },
  lifecycle: {
    issuedAt: 1745900000,
    expiresAt: 1777436000,
    revoked: false,
  },
  provenance: {
    issuerId: "did:lemma:org:trust-anchor",
  },
};

const purchaserGate: PaymentGate = { role: "purchaser", maxSpend: 100000 };
const adminGate: PaymentGate = { role: "admin", maxSpend: 50000 };

describe("witness", () => {
  it("maps credential + gate into circuit input shape", () => {
    const w = witness(sampleCred, purchaserGate);

    expect(w.credentialCommitment).toBeTruthy();
    expect(w.roleHash).toBeTruthy();
    expect(w.spendLimit).toBe("50000");
    expect(w.requiredRoleHash).toBe(w.roleHash);
    expect(w.maxSpend).toBe("100000");
    expect(w.nowSec).toMatch(/^\d+$/);
    expect(w.salt).toBeTruthy();
  });

  it("produces identical roleHash for same gate role", () => {
    const w1 = witness(sampleCred, purchaserGate);
    const w2 = witness(sampleCred, purchaserGate);
    expect(w1.roleHash).toBe(w2.roleHash);
    expect(w1.requiredRoleHash).toBe(w2.requiredRoleHash);
  });

  it("produces different roleHash for different gate roles", () => {
    const w1 = witness(sampleCred, purchaserGate);
    const w2 = witness(sampleCred, adminGate);
    expect(w1.roleHash).not.toBe(w2.roleHash);
  });

  it("defaults spendLimit to 0 when financial.spendLimit is absent", () => {
    const credNoLimit = { ...sampleCred, financial: { currency: "USD" } };
    const w = witness(credNoLimit as AgentCredential, purchaserGate);
    expect(w.spendLimit).toBe("0");
  });

  it("defaults spendLimit to 0 when financial object has no spendLimit key", () => {
    const credNoLimit = { ...sampleCred, financial: {} };
    const w = witness(credNoLimit as AgentCredential, purchaserGate);
    expect(w.spendLimit).toBe("0");
  });

  it("produces non-empty salt that differs from roleHash", () => {
    const w = witness(sampleCred, purchaserGate);
    expect(w.salt).toBeTruthy();
    expect(w.salt).not.toBe(w.roleHash);
  });

  it("accepts spendLimit equal to gate ceiling (edge case: less-than-or-equal)", () => {
    const exactLimitCred: AgentCredential = {
      ...sampleCred,
      financial: { ...sampleCred.financial, spendLimit: 100000 },
    };
    const w = witness(exactLimitCred, purchaserGate);
    expect(w.spendLimit).toBe("100000");
    expect(w.maxSpend).toBe("100000");
  });

  it("handles zero-ceiling gate (read-only)", () => {
    const readOnlyGate: PaymentGate = { role: "viewer", maxSpend: 0 };
    const zeroLimitCred: AgentCredential = {
      ...sampleCred,
      financial: { spendLimit: 0, currency: "USD" },
    };
    const w = witness(zeroLimitCred, readOnlyGate);
    expect(w.spendLimit).toBe("0");
    expect(w.maxSpend).toBe("0");
  });

  it("hashes only the gate role, not all credential roles", () => {
    const w = witness(sampleCred, purchaserGate);
    const adminW = witness(sampleCred, adminGate);
    expect(w.roleHash).not.toBe(adminW.roleHash);
    expect(w.requiredRoleHash).not.toBe(adminW.requiredRoleHash);
  });
});

describe("connect", () => {
  it("returns a curried function that creates a LemmaClient", () => {
    const factory = connect("https://example.com");
    expect(typeof factory).toBe("function");
    const client = factory("test-api-key");
    expect(client).toBeTruthy();
  });
});

describe("prove", () => {
  it("is exported as a function", () => {
    expect(typeof prove).toBe("function");
  });
});

describe("submit", () => {
  it("is exported as a function", () => {
    expect(typeof submit).toBe("function");
  });
});
