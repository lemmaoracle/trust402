import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentCredential, CommitOutput, PaymentGate } from "./index.js";
import type { ProveOutput, LemmaClient } from "@lemmaoracle/sdk";

// ── Fixtures ──────────────────────────────────────────────────────────

const sampleCred: AgentCredential = {
  schema: "agent-identity-authority-v1",
  identity: {
    agentId: "agent-0xabc123",
    subjectId: "did:lemma:agent:0xabc123",
    controllerId: "did:lemma:org:acme",
    orgId: "acme",
  },
  authority: {
    roles: [{ name: "purchaser" }, { name: "viewer" }],
    scopes: [{ name: "procurement" }, { name: "reporting" }],
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
    revocationRef: "",
  },
  provenance: {
    issuerId: "did:lemma:org:trust-anchor",
    sourceSystem: "",
    generatorId: "",
    chainContext: {
      chainId: 1,
      network: "mainnet",
    },
  },
};

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
const mockAgentCommit = vi.fn().mockResolvedValue(mockCommitOutput);
const mockCreate = vi.fn().mockReturnValue(mockClient);

vi.mock("@lemmaoracle/sdk", () => ({
  create: mockCreate,
  prover: { prove: mockProve },
  proofs: { submit: mockSubmit },
}));

vi.mock("@lemmaoracle/agent", () => ({
  commit: mockAgentCommit,
  computeCredentialCommitment: vi.fn(),
  credential: vi.fn(),
  validate: vi.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────

describe("prove", () => {
  beforeEach(() => {
    mockProve.mockClear();
  });

  it("delegates to prover.prove with agent-identity-v1 circuit and commitOutput as witness", async () => {
    const { prove } = await import("./index.js");

    const result = await prove(mockClient, mockCommitOutput);

    expect(mockProve).toHaveBeenCalledWith(mockClient, {
      circuitId: "agent-identity-v1",
      witness: mockCommitOutput,
    });
    expect(result).toEqual(mockProveOutput);
  });

  it("is exported as a function", async () => {
    const { prove } = await import("./index.js");
    expect(typeof prove).toBe("function");
  });
});

describe("submit", () => {
  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it("delegates to proofs.submit with agent-identity-v1 circuitId", async () => {
    const { submit } = await import("./index.js");

    await submit(mockClient, "docHash123", mockProveOutput);

    expect(mockSubmit).toHaveBeenCalledWith(mockClient, {
      docHash: "docHash123",
      circuitId: "agent-identity-v1",
      proof: mockProveOutput.proof,
      inputs: mockProveOutput.inputs,
    });
  });

  it("is exported as a function", async () => {
    const { submit } = await import("./index.js");
    expect(typeof submit).toBe("function");
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

describe("re-exported types", () => {
  it("AgentCredential is importable", () => {
    const cred: AgentCredential = sampleCred;
    expect(cred.schema).toBe("agent-identity-authority-v1");
  });

  it("CommitOutput is importable", () => {
    const output: CommitOutput = mockCommitOutput;
    expect(output.root).toBeTruthy();
    expect(output.sectionHashes).toBeTruthy();
    expect(output.salt).toBeTruthy();
  });
});
