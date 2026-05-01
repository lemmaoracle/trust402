import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommitOutput } from "@trust402/identity";
import type { ProveOutput, LemmaClient } from "@lemmaoracle/sdk";
import type { PaymentGate } from "@trust402/roles";
import type { IdentityArtifact } from "./types.js";

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
const sampleArtifact: IdentityArtifact = {
  commitOutput: mockCommitOutput,
  identityProof: mockIdentityProof,
};

// ── Mocks ─────────────────────────────────────────────────────────────

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
const mockIdentitySubmit = vi.fn().mockResolvedValue(mockSubmission);

vi.mock("@trust402/identity", () => ({
  commit: vi.fn(),
  prove: vi.fn(),
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

describe("proveRoleFromArtifact", () => {
  beforeEach(() => {
    mockRoleWitness.mockClear();
    mockRoleProve.mockClear();
    mockRoleSubmit.mockClear();
    mockIdentitySubmit.mockClear();

    mockRoleWitness.mockReturnValue({
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
    mockRoleProve.mockResolvedValue(mockRoleProof);
    mockRoleSubmit.mockResolvedValue(mockSubmission);
    mockIdentitySubmit.mockResolvedValue(mockSubmission);
  });

  it("builds witness from gate and artifact.commitOutput, then proves and submits", async () => {
    const { proveRoleFromArtifact } = await import("./prove-role-from-artifact.js");

    const result = await proveRoleFromArtifact(mockClient, sampleArtifact, sampleGate);

    expect(mockRoleWitness).toHaveBeenCalledWith(sampleGate, mockCommitOutput);
    expect(mockRoleProve).toHaveBeenCalled();
    expect(mockIdentitySubmit).toHaveBeenCalledWith(mockClient, mockCommitOutput.root, mockIdentityProof);
    expect(mockRoleSubmit).toHaveBeenCalledWith(mockClient, mockCommitOutput.root, mockRoleProof);

    expect(result.identityProof).toEqual(mockIdentityProof);
    expect(result.roleProof).toEqual(mockRoleProof);
    expect(result.identitySubmission).toEqual(mockSubmission);
    expect(result.roleSubmission).toEqual(mockSubmission);
  });

  it("does not call identity commit or prove (uses artifact directly)", async () => {
    const { proveRoleFromArtifact } = await import("./prove-role-from-artifact.js");
    const { commit: identityCommit, prove: identityProve } = await import("@trust402/identity");

    await proveRoleFromArtifact(mockClient, sampleArtifact, sampleGate);

    expect(identityCommit).not.toHaveBeenCalled();
    expect(identityProve).not.toHaveBeenCalled();
  });

  it("sends artifact.identityProof directly to oracle submission", async () => {
    const { proveRoleFromArtifact } = await import("./prove-role-from-artifact.js");

    await proveRoleFromArtifact(mockClient, sampleArtifact, sampleGate);

    expect(mockIdentitySubmit).toHaveBeenCalledWith(mockClient, mockCommitOutput.root, mockIdentityProof);
  });

  it("rejects with error when role proof generation fails", async () => {
    mockRoleProve.mockRejectedValue(new Error("Circuit error"));

    const { proveRoleFromArtifact } = await import("./prove-role-from-artifact.js");

    await expect(proveRoleFromArtifact(mockClient, sampleArtifact, sampleGate)).rejects.toThrow(
      "Role proof generation failed",
    );
  });

  it("proceeds when oracle submission fails (non-fatal) and sets submission to undefined", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockIdentitySubmit.mockRejectedValue(new Error("Network error"));
    mockRoleSubmit.mockRejectedValue(new Error("Network error"));

    const { proveRoleFromArtifact } = await import("./prove-role-from-artifact.js");

    const result = await proveRoleFromArtifact(mockClient, sampleArtifact, sampleGate);

    expect(result.identityProof).toEqual(mockIdentityProof);
    expect(result.roleProof).toEqual(mockRoleProof);
    expect(result.identitySubmission).toBeUndefined();
    expect(result.roleSubmission).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});