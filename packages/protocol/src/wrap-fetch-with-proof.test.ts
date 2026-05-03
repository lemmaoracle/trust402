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
const mockCredential = {
  schema: "agent-identity-authority-v1",
  identity: { agentId: "agent-0xabc123", subjectId: "did:lemma:agent:0xabc123", controllerId: "did:lemma:org:acme", orgId: "acme" },
  authority: {
    roles: [{ name: "purchaser" }, { name: "viewer" }],
    scopes: [{ name: "procurement" }, { name: "reporting" }],
    permissions: [{ resource: "payments", action: "create" }, { resource: "reports", action: "read" }],
  },
  financial: { spendLimit: 50000, currency: "USD", paymentPolicy: "auto-approve-below-limit" },
  lifecycle: { issuedAt: 1745900000, expiresAt: 1777436000, revoked: false, revocationRef: "" },
  provenance: { issuerId: "did:lemma:org:trust-anchor", sourceSystem: "", generatorId: "", chainContext: { chainId: 1, network: "mainnet" } },
} as const;

const sampleArtifact: IdentityArtifact = {
  commitOutput: mockCommitOutput,
  identityProof: mockIdentityProof,
  docHash: "0xdeadbeefdocHash",
  credential: mockCredential,
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
  register: vi.fn(),
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

describe("wrapFetchWithProof", () => {
  let mockBaseFetch: ReturnType<typeof vi.fn>;

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

    mockBaseFetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
  });

  it("calls base fetch after successful role proof from artifact", async () => {
    const { wrapFetchWithProof } = await import("./wrap-fetch-with-proof.js");
    const wrappedFetch = wrapFetchWithProof(mockBaseFetch, sampleArtifact, sampleGate, mockClient);

    const response = await wrappedFetch("https://example.com/api");

    expect(mockRoleWitness).toHaveBeenCalledWith(sampleGate, mockCommitOutput);
    expect(mockBaseFetch).toHaveBeenCalledWith("https://example.com/api", undefined);
    expect(response.status).toBe(200);
  });

  it("does NOT call base fetch when role proof fails", async () => {
    mockRoleProve.mockRejectedValue(new Error("Circuit error"));

    const { wrapFetchWithProof } = await import("./wrap-fetch-with-proof.js");
    const wrappedFetch = wrapFetchWithProof(mockBaseFetch, sampleArtifact, sampleGate, mockClient);

    await expect(wrappedFetch("https://example.com/api")).rejects.toThrow(
      "Role proof generation failed",
    );
    expect(mockBaseFetch).not.toHaveBeenCalled();
  });

  it("calls base fetch even when oracle submission fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockIdentitySubmit.mockRejectedValue(new Error("Network error"));
    mockRoleSubmit.mockRejectedValue(new Error("Network error"));

    const { wrapFetchWithProof } = await import("./wrap-fetch-with-proof.js");
    const wrappedFetch = wrapFetchWithProof(mockBaseFetch, sampleArtifact, sampleGate, mockClient);

    const response = await wrappedFetch("https://example.com/api");

    expect(mockBaseFetch).toHaveBeenCalledWith("https://example.com/api", undefined);
    expect(response.status).toBe(200);

    warnSpy.mockRestore();
  });

  it("preserves RequestInit when calling base fetch", async () => {
    const { wrapFetchWithProof } = await import("./wrap-fetch-with-proof.js");
    const wrappedFetch = wrapFetchWithProof(mockBaseFetch, sampleArtifact, sampleGate, mockClient);

    const init: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "test" }),
    };

    await wrappedFetch("https://example.com/api", init);

    expect(mockBaseFetch).toHaveBeenCalledWith("https://example.com/api", init);
  });

  it("is composable with wrapFetchWithPayment", async () => {
    const mockWrapFetchWithPayment = vi.fn((baseFetch: typeof fetch) =>
      (input: RequestInfo | URL, init?: RequestInit) =>
        baseFetch(input, init),
    );

    const { wrapFetchWithProof } = await import("./wrap-fetch-with-proof.js");

    const paymentFetch = mockWrapFetchWithPayment(mockBaseFetch);
    const proofThenPaymentFetch = wrapFetchWithProof(paymentFetch, sampleArtifact, sampleGate, mockClient);

    const response = await proofThenPaymentFetch("https://example.com/api");

    expect(mockBaseFetch).toHaveBeenCalledWith("https://example.com/api", undefined);
    expect(response.status).toBe(200);
  });
});
