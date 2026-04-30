import { describe, it, expect } from "vitest";
import { computeCredentialCommitment } from "@lemmaoracle/agent";
import type { NormalizedAgentCredential } from "@lemmaoracle/agent";
import { poseidon6 } from "poseidon-lite";

// ── Fixtures ──────────────────────────────────────────────────────────

const normalizedCred: NormalizedAgentCredential = {
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
};

// ── Tests ─────────────────────────────────────────────────────────────

describe("Poseidon commitment flow", () => {
  it("computeCredentialCommitment produces deterministic section hashes", () => {
    const result1 = computeCredentialCommitment(normalizedCred, "01");
    const result2 = computeCredentialCommitment(normalizedCred, "01");

    expect(result1.sectionHashes.identityHash).toBe(result2.sectionHashes.identityHash);
    expect(result1.sectionHashes.authorityHash).toBe(result2.sectionHashes.authorityHash);
    expect(result1.sectionHashes.financialHash).toBe(result2.sectionHashes.financialHash);
    expect(result1.sectionHashes.lifecycleHash).toBe(result2.sectionHashes.lifecycleHash);
    expect(result1.sectionHashes.provenanceHash).toBe(result2.sectionHashes.provenanceHash);
  });

  it("root matches poseidon6([...sectionHashes, salt])", () => {
    const fixedSaltHex = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    const result = computeCredentialCommitment(normalizedCred, fixedSaltHex);

    const saltScalar = BigInt(`0x${fixedSaltHex}`);
    const expectedRoot = poseidon6([
      BigInt(result.sectionHashes.identityHash ?? "0"),
      BigInt(result.sectionHashes.authorityHash ?? "0"),
      BigInt(result.sectionHashes.financialHash ?? "0"),
      BigInt(result.sectionHashes.lifecycleHash ?? "0"),
      BigInt(result.sectionHashes.provenanceHash ?? "0"),
      saltScalar,
    ]);

    expect(result.root).toBe(expectedRoot.toString());
  });

  it("different salt produces different root", () => {
    const result1 = computeCredentialCommitment(normalizedCred, "01");
    const result2 = computeCredentialCommitment(normalizedCred, "02");

    expect(result1.root).not.toBe(result2.root);
  });

  it("different credentials produce different section hashes", () => {
    const altCred: NormalizedAgentCredential = {
      ...normalizedCred,
      identity: {
        ...normalizedCred.identity,
        agentId: "agent-DIFFERENT",
      },
    };

    const result1 = computeCredentialCommitment(normalizedCred, "01");
    const result2 = computeCredentialCommitment(altCred, "01");

    expect(result1.sectionHashes.identityHash).not.toBe(result2.sectionHashes.identityHash);
    expect(result1.root).not.toBe(result2.root);
  });

  it("section hashes are non-empty strings", () => {
    const result = computeCredentialCommitment(normalizedCred);

    expect(result.sectionHashes.identityHash).toBeTruthy();
    expect(result.sectionHashes.authorityHash).toBeTruthy();
    expect(result.sectionHashes.financialHash).toBeTruthy();
    expect(result.sectionHashes.lifecycleHash).toBeTruthy();
    expect(result.sectionHashes.provenanceHash).toBeTruthy();
    expect(result.root).toBeTruthy();
    expect(result.salt).toBeTruthy();
  });
});
