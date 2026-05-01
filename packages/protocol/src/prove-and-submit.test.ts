import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentCredential, CommitOutput } from "@trust402/identity";
import type { ProveOutput, LemmaClient } from "@lemmaoracle/sdk";
import type { PaymentGate } from "@trust402/roles";

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

const mockIdentityProof: ProveOutput = {
  proof: "mock-identity-proof",
  inputs: ["1234567890123456789012345678901234567890123456789012345678901234"],
};

const mockRoleProof: ProveOutput = {
  proof: "mock-role-proof",
  inputs: ["111", "100000", "1700000000", "roleGateCommitmentValue", "1234567890123456789012345678901234567890123456789012345678901234"],
};

const mockSubmission = { txHash: "0xabc123def456", status: "submitted" };
const mockClient = { apiKey: "test" } as unknown as LemmaClient;
const sampleGate: PaymentGate = { role: "purchaser", maxSpend: 100000 };

// ── Mocks ─────────────────────────────────────────────────────────────

const mockIdentityCommit = vi.fn().mockResolvedValue(mockCommitOutput);
const mockIdentityProve = vi.fn().mockResolvedValue(mockIdentityProof);
const mockIdentitySubmit = vi.fn().mockResolvedValue(mockSubmission);
const mockRoleWitness = vi.fn().mockReturnValue({
  credentialCommitment: mockCommitOutput.root,
  roleHash: "12345",
  spendLimit: "50000",
  salt: "99999",
  requiredRoleHash: "12345",
  maxSpend: "100000",
  nowSec: "1700000000",
  roleGateCommitment: "roleGateCommitmentValue",
  credentialCommitmentPublic: mockCommitOutput.root,
});
const mockRoleProve = vi.fn().mockResolvedValue(mockRoleProof);
const mockRoleSubmit = vi.fn().mockResolvedValue(mockSubmission);

vi.mock("@trust402/identity", () => ({
  commit: mockIdentityCommit,
  prove: mockIdentityProve,
  submit: mockIdentitySubmit,
}));

vi.mock("@trust402/roles", () => ({
  witness: mockRoleWitness,
  prove: mockRoleProve,
  submit: mockRoleSubmit,
}));

vi.mock("@lemmaoracle/sdk", () => ({
  create: vi.fn(),
  prover: { prove: vi.fn() },
  proofs: { submit: vi.fn() },
}));

vi.mock("@lemmaoracle/agent", () => ({
  commit: vi.fn(),
  computeCredentialCommitment: vi.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────

describe("proveAndSubmit", () => {
  beforeEach(() => {
    mockIdentityCommit.mockClear();
    mockIdentityProve.mockClear();
    mockIdentitySubmit.mockClear();
    mockRoleWitness.mockClear();
    mockRoleProve.mockClear();
    mockRoleSubmit.mockClear();

    mockIdentityCommit.mockResolvedValue(mockCommitOutput);
    mockIdentityProve.mockResolvedValue(mockIdentityProof);
    mockIdentitySubmit.mockResolvedValue(mockSubmission);
    mockRoleProve.mockResolvedValue(mockRoleProof);
    mockRoleSubmit.mockResolvedValue(mockSubmission);
  });

  it("runs the full pipeline: commit → identity prove → witness → role prove → submit both", async () => {
    const { proveAndSubmit } = await import("./prove-and-submit.js");

    const result = await proveAndSubmit(mockClient, sampleCred, sampleGate);

    expect(mockIdentityCommit).toHaveBeenCalledWith(mockClient, sampleCred);
    expect(mockIdentityProve).toHaveBeenCalledWith(mockClient, mockCommitOutput);
    expect(mockRoleWitness).toHaveBeenCalledWith(sampleCred, sampleGate, mockCommitOutput);
    expect(mockRoleProve).toHaveBeenCalled();
    expect(mockIdentitySubmit).toHaveBeenCalled();
    expect(mockRoleSubmit).toHaveBeenCalled();

    expect(result.commitOutput).toEqual(mockCommitOutput);
    expect(result.identityProof).toEqual(mockIdentityProof);
    expect(result.roleProof).toEqual(mockRoleProof);
    expect(result.identitySubmission).toEqual(mockSubmission);
    expect(result.roleSubmission).toEqual(mockSubmission);
  });

  it("rejects with error when identity proof generation fails", async () => {
    mockIdentityProve.mockRejectedValue(new Error("SDK error"));

    const { proveAndSubmit } = await import("./prove-and-submit.js");

    await expect(proveAndSubmit(mockClient, sampleCred, sampleGate)).rejects.toThrow(
      "Identity proof generation failed",
    );
  });

  it("rejects with error when role proof generation fails", async () => {
    mockRoleProve.mockRejectedValue(new Error("Circuit error"));

    const { proveAndSubmit } = await import("./prove-and-submit.js");

    await expect(proveAndSubmit(mockClient, sampleCred, sampleGate)).rejects.toThrow(
      "Role proof generation failed",
    );
  });

  it("proceeds when oracle submission fails (non-fatal) and sets submission to undefined", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockIdentitySubmit.mockRejectedValue(new Error("Network error"));
    mockRoleSubmit.mockRejectedValue(new Error("Network error"));

    const { proveAndSubmit } = await import("./prove-and-submit.js");

    const result = await proveAndSubmit(mockClient, sampleCred, sampleGate);

    expect(result.identityProof).toEqual(mockIdentityProof);
    expect(result.roleProof).toEqual(mockRoleProof);
    expect(result.identitySubmission).toBeUndefined();
    expect(result.roleSubmission).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
