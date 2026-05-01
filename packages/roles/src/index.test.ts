import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommitOutput, PaymentGate, CircuitWitness } from "./index.js";
import type { ProveOutput, LemmaClient } from "@lemmaoracle/sdk";
import { poseidon4 } from "poseidon-lite";

// ── Fixtures ──────────────────────────────────────────────────────────

const mockCommitOutput: CommitOutput = {
  normalized: {
    schema: "agent-identity-authority-v1",
    identity: {
      agentId: "agent-0xabc123",
      subjectId: "did:lemma:agent:0xabc123",
      controllerId: "did:lemma:org:acme",
      orgId: "acme",
    },
    authority: {
      roles: "purchaser,viewer",
      scopes: "procurement,reporting",
      permissions: "payments:create,reports:read",
    },
    financial: {
      spendLimit: "50000",
      currency: "USD",
      paymentPolicy: "auto-approve-below-limit",
    },
    lifecycle: {
      issuedAt: "1745900000",
      expiresAt: "1777436000",
      revoked: "false",
      revocationRef: "",
    },
    provenance: {
      issuerId: "did:lemma:org:trust-anchor",
      sourceSystem: "",
      generatorId: "",
      chainId: "1",
      network: "mainnet",
    },
  },
  root: "1234567890123456789012345678901234567890123456789012345678901234",
  sectionHashes: {
    identityHash: "1111111111111111111111111111111111111111111111111111111111111111",
    authorityHash: "2222222222222222222222222222222222222222222222222222222222222222",
    financialHash: "3333333333333333333333333333333333333333333333333333333333333333",
    lifecycleHash: "4444444444444444444444444444444444444444444444444444444444444444",
    provenanceHash: "5555555555555555555555555555555555555555555555555555555555555555",
  },
  salt: "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
};

const mockProveOutput: ProveOutput = {
  proof: "mock-proof-string",
  inputs: ["1234567890123456789012345678901234567890123456789012345678901234"],
};

const mockSubmission = { txHash: "0xabc123def456", status: "submitted" };
const mockClient = { apiKey: "test" } as unknown as LemmaClient;

// ── Mocks ─────────────────────────────────────────────────────────────

const mockProve = vi.fn().mockResolvedValue(mockProveOutput);
const mockSubmit = vi.fn().mockResolvedValue(mockSubmission);
const mockCreate = vi.fn().mockReturnValue(mockClient);

vi.mock("@lemmaoracle/sdk", () => ({
  create: mockCreate,
  prover: { prove: mockProve },
  proofs: { submit: mockSubmit },
}));

vi.mock("@lemmaoracle/agent", () => ({
  commit: vi.fn(),
  computeCredentialCommitment: vi.fn(),
  credential: vi.fn(),
  validate: vi.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────

describe("fieldHash", () => {
  it("produces a deterministic BN254 field element string", async () => {
    const { fieldHash } = await import("./index.js");
    const h1 = fieldHash("purchaser");
    const h2 = fieldHash("purchaser");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^\d+$/);
  });

  it("produces different hashes for different role names", async () => {
    const { fieldHash } = await import("./index.js");
    const h1 = fieldHash("purchaser");
    const h2 = fieldHash("viewer");
    expect(h1).not.toBe(h2);
  });
});

describe("witness", () => {
  it("roleHash equals requiredRoleHash for same gate role", async () => {
    const { witness } = await import("./index.js");
    const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };
    const w = witness(gate, mockCommitOutput);
    expect(w.roleHash).toBe(w.requiredRoleHash);
  });

  it("spendLimit is sourced from commitOutput.normalized.financial.spendLimit", async () => {
    const { witness } = await import("./index.js");
    const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };
    const w = witness(gate, mockCommitOutput);
    expect(w.spendLimit).toBe("50000");
  });

  it("credentialCommitment equals credentialCommitmentPublic", async () => {
    const { witness } = await import("./index.js");
    const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };
    const w = witness(gate, mockCommitOutput);
    expect(w.credentialCommitment).toBe(w.credentialCommitmentPublic);
    expect(w.credentialCommitment).toBe(mockCommitOutput.root);
  });

  it("roleGateCommitment matches poseidon4 computation", async () => {
    const { witness, fieldHash } = await import("./index.js");
    const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };
    const w = witness(gate, mockCommitOutput);

    const expected = poseidon4([
      BigInt(mockCommitOutput.root),
      BigInt(fieldHash(gate.role)),
      BigInt(w.spendLimit),
      BigInt(w.salt),
    ]).toString();

    expect(w.roleGateCommitment).toBe(expected);
  });

  it("produces deterministic output for same inputs (ignoring nowSec)", async () => {
    const { witness } = await import("./index.js");
    const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };
    const w1 = witness(gate, mockCommitOutput);
    const w2 = witness(gate, mockCommitOutput);
    expect(w1.roleHash).toBe(w2.roleHash);
    expect(w1.spendLimit).toBe(w2.spendLimit);
    expect(w1.roleGateCommitment).toBe(w2.roleGateCommitment);
  });
});

describe("prove", () => {
  beforeEach(() => {
    mockProve.mockClear();
  });

  it("delegates to prover.prove with role-spend-limit-v1 circuit", async () => {
    const { prove, witness } = await import("./index.js");
    const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };
    const w = witness(gate, mockCommitOutput);

    const result = await prove(mockClient, w);

    expect(mockProve).toHaveBeenCalledWith(mockClient, {
      circuitId: "role-spend-limit-v1",
      witness: w,
    });
    expect(result).toEqual(mockProveOutput);
  });
});

describe("submit", () => {
  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it("delegates to proofs.submit with role-spend-limit-v1 circuitId", async () => {
    const { submit } = await import("./index.js");

    await submit(mockClient, "docHash123", mockProveOutput);

    expect(mockSubmit).toHaveBeenCalledWith(mockClient, {
      docHash: "docHash123",
      circuitId: "role-spend-limit-v1",
      proof: mockProveOutput.proof,
      inputs: mockProveOutput.inputs,
    });
  });
});

describe("connect", () => {
  it("returns a curried function that creates a LemmaClient", async () => {
    const { connect } = await import("./index.js");
    const factory = connect("https://example.com");
    expect(typeof factory).toBe("function");
    const client = factory("test-api-key");
    expect(client).toBeTruthy();
    expect(mockCreate).toHaveBeenCalledWith({ apiBase: "https://example.com", apiKey: "test-api-key" });
  });
});

describe("PaymentGate type", () => {
  it("accepts a valid PaymentGate", () => {
    const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };
    expect(gate.role).toBe("purchaser");
    expect(gate.maxSpend).toBe(100000);
  });
});

describe("CircuitWitness type", () => {
  it("accepts a valid CircuitWitness", async () => {
    const { witness } = await import("./index.js");
    const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };
    const w: CircuitWitness = witness(gate, mockCommitOutput);
    expect(w.credentialCommitment).toBeTruthy();
    expect(w.roleHash).toBeTruthy();
    expect(w.roleGateCommitment).toBeTruthy();
  });
});