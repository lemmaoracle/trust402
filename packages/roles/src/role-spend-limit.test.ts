import { describe, it, expect } from "vitest";
import { poseidon6 } from "poseidon-lite";
import type { NormalizedAgentCredential } from "@lemmaoracle/agent";

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

describe("fieldHash determinism and BN254 bounds", () => {
  it("produces consistent hashes for same input", async () => {
    const { fieldHash } = await import("./index.js");
    const h1 = fieldHash("admin");
    const h2 = fieldHash("admin");
    expect(h1).toBe(h2);
  });

  it("produces a value within BN254 field", async () => {
    const { fieldHash } = await import("./index.js");
    const h = fieldHash("test-role");
    const val = BigInt(h);
    const prime = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    expect(val >= BigInt(0)).toBe(true);
    expect(val < prime).toBe(true);
  });
});

describe("Poseidon commitment flow (real computeCredentialCommitment)", () => {
  it("computeCredentialCommitment produces deterministic section hashes", async () => {
    const { computeCredentialCommitment } = await import("@lemmaoracle/agent");
    const result1 = computeCredentialCommitment(normalizedCred, "01");
    const result2 = computeCredentialCommitment(normalizedCred, "01");

    expect(result1.sectionHashes.identityHash).toBe(result2.sectionHashes.identityHash);
    expect(result1.sectionHashes.authorityHash).toBe(result2.sectionHashes.authorityHash);
    expect(result1.sectionHashes.financialHash).toBe(result2.sectionHashes.financialHash);
    expect(result1.sectionHashes.lifecycleHash).toBe(result2.sectionHashes.lifecycleHash);
    expect(result1.sectionHashes.provenanceHash).toBe(result2.sectionHashes.provenanceHash);
  });

  it("root matches poseidon6([...sectionHashes, salt])", async () => {
    const { computeCredentialCommitment } = await import("@lemmaoracle/agent");
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

  it("different salt produces different root", async () => {
    const { computeCredentialCommitment } = await import("@lemmaoracle/agent");
    const result1 = computeCredentialCommitment(normalizedCred, "01");
    const result2 = computeCredentialCommitment(normalizedCred, "02");
    expect(result1.root).not.toBe(result2.root);
  });

  it("section hashes are non-empty strings", async () => {
    const { computeCredentialCommitment } = await import("@lemmaoracle/agent");
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
