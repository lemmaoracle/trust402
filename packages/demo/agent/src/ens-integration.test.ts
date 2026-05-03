import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateEnv } from "./env.js";
import { resolveEnsNames } from "./ens.js";
import { credential } from "@lemmaoracle/agent";

const ORIGINAL_ENV = { ...process.env };

vi.mock("viem", () => ({
  createPublicClient: vi.fn(() => ({
    getEnsAddress: vi.fn(),
  })),
  http: vi.fn(() => "mocked-transport"),
}));

beforeEach(() => {
  process.env.RESOURCE_URL = "http://localhost:3000";
  process.env.LEMMA_API_KEY = "test-api-key";
  process.env.AGENT_PRIVATE_KEY = "0xacbdef0123456789";
  process.env.HOLDER_PUBLIC_KEY = "0xpubkey";
  process.env.BASE_SEPOLIA_RPC_URL = "https://base-sepolia.example.com";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("ENS integration: env → resolve → credential", () => {
  it("uses ENS names in credential after resolution", async () => {
    const { createPublicClient } = await import("viem");
    const agentAddr = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const issuerAddr = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    let callCount = 0;
    const mockGetEnsAddress = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? agentAddr : issuerAddr;
    });
    (createPublicClient as ReturnType<typeof vi.fn>).mockReturnValue({
      getEnsAddress: mockGetEnsAddress,
    });

    const env = validateEnv();
    const resolvedEnv = await resolveEnsNames(env);

    expect(resolvedEnv.agentId).toBe("agent.trust402.eth");
    expect(resolvedEnv.issuerId).toBe("issuer.trust402.eth");
    expect(resolvedEnv.resolvedAgentAddress).toBe(agentAddr);
    expect(resolvedEnv.resolvedIssuerAddress).toBe(issuerAddr);

    const result = credential({
      agentId: resolvedEnv.agentId,
      subjectId: resolvedEnv.agentId,
      roles: ["purchaser"],
      issuerId: resolvedEnv.issuerId,
      spendLimit: resolvedEnv.maxSpend,
      paymentPolicy: "auto-approve-below-limit",
    });

    expect(result.valid).toBe(true);
    expect(result.credential.identity.subjectId).toBe("agent.trust402.eth");
    expect(result.credential.provenance.issuerId).toBe("issuer.trust402.eth");
  });

  it("falls back to AGENT_ID when explicitly set", async () => {
    process.env.AGENT_ID = "did:trust402:custom-agent";
    process.env.ISSUER_ID = "did:trust402:custom-issuer";
    delete process.env.AGENT_ENS_NAME;
    delete process.env.ISSUER_ENS_NAME;

    const env = validateEnv();
    const resolvedEnv = await resolveEnsNames(env);

    expect(resolvedEnv.agentId).toBe("did:trust402:custom-agent");
    expect(resolvedEnv.issuerId).toBe("did:trust402:custom-issuer");
  });

  it("continues when ENS resolution fails", async () => {
    const { createPublicClient } = await import("viem");
    const mockGetEnsAddress = vi.fn().mockRejectedValue(new Error("network error"));
    (createPublicClient as ReturnType<typeof vi.fn>).mockReturnValue({
      getEnsAddress: mockGetEnsAddress,
    });

    const env = validateEnv();
    const resolvedEnv = await resolveEnsNames(env);

    expect(resolvedEnv.resolvedAgentAddress).toBeUndefined();
    expect(resolvedEnv.resolvedIssuerAddress).toBeUndefined();
    expect(resolvedEnv.agentId).toBe("agent.trust402.eth");
  });
});
