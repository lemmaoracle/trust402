import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveEnsName, resolveEnsNames } from "./ens.js";
import type { EnvConfig } from "./env.js";

vi.mock("viem", () => ({
  createPublicClient: vi.fn(() => ({
    getEnsAddress: vi.fn(),
  })),
  http: vi.fn(() => "mocked-transport"),
}));

vi.mock("viem/chains", () => ({
  mainnet: { id: 1, name: "Ethereum", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://eth.llamarpc.com"] } } },
}));

const baseEnv: EnvConfig = {
  resourceUrl: "http://localhost:3000",
  lemmaApiKey: "test-key",
  agentPrivateKey: "0xacbdef0123456789",
  artifactPath: "./artifact.json",
  maxSpend: 1000,
  lemmaApiBase: "https://workers.lemma.workers.dev",
  agentId: "agent.trust402.eth",
  issuerId: "issuer.trust402.eth",
  holderPublicKey: "0xpub",
  baseSepoliaRpcUrl: "https://base-sepolia.example.com",
  ethereumRpcUrl: undefined,
  keeperhubWebhookUrl: undefined,
  keeperhubApiKey: undefined,
  agentEnsName: "agent.trust402.eth",
  issuerEnsName: "issuer.trust402.eth",
  resolvedAgentAddress: undefined,
  resolvedIssuerAddress: undefined,
};

describe("resolveEnsName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns undefined when getEnsAddress returns null", async () => {
    const { createPublicClient } = await import("viem");
    const mockGetEnsAddress = vi.fn().mockResolvedValue(null);
    (createPublicClient as ReturnType<typeof vi.fn>).mockReturnValue({
      getEnsAddress: mockGetEnsAddress,
    });

    const result = await resolveEnsName("https://rpc.example.com", "nonexistent.eth");
    expect(result).toBeUndefined();
  });

  it("returns the address when resolution succeeds", async () => {
    const { createPublicClient } = await import("viem");
    const mockAddress = "0x1234567890abcdef1234567890abcdef12345678";
    const mockGetEnsAddress = vi.fn().mockResolvedValue(mockAddress);
    (createPublicClient as ReturnType<typeof vi.fn>).mockReturnValue({
      getEnsAddress: mockGetEnsAddress,
    });

    const result = await resolveEnsName("https://rpc.example.com", "agent.trust402.eth");
    expect(result).toBe(mockAddress);
  });
});

describe("resolveEnsNames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses public fallback RPC when ethereumRpcUrl is undefined", async () => {
    const { createPublicClient } = await import("viem");
    const agentAddr = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    let callCount = 0;
    const mockGetEnsAddress = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? agentAddr : undefined;
    });
    (createPublicClient as ReturnType<typeof vi.fn>).mockReturnValue({
      getEnsAddress: mockGetEnsAddress,
    });

    const env = { ...baseEnv, ethereumRpcUrl: undefined };
    const result = await resolveEnsNames(env);
    expect(result.resolvedAgentAddress).toBe(agentAddr);
  });

  it("uses custom ethereumRpcUrl when provided", async () => {
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

    const env = { ...baseEnv, ethereumRpcUrl: "https://custom-rpc.example.com" };
    const result = await resolveEnsNames(env);
    expect(result.resolvedAgentAddress).toBe(agentAddr);
    expect(result.resolvedIssuerAddress).toBe(issuerAddr);
  });

  it("resolves both agent and issuer ENS names", async () => {
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

    const result = await resolveEnsNames(baseEnv);
    expect(result.resolvedAgentAddress).toBe(agentAddr);
    expect(result.resolvedIssuerAddress).toBe(issuerAddr);
  });

  it("returns undefined on resolution failure", async () => {
    const { createPublicClient } = await import("viem");
    const mockGetEnsAddress = vi.fn().mockRejectedValue(new Error("network error"));
    (createPublicClient as ReturnType<typeof vi.fn>).mockReturnValue({
      getEnsAddress: mockGetEnsAddress,
    });

    const result = await resolveEnsNames(baseEnv);
    expect(result.resolvedAgentAddress).toBeUndefined();
    expect(result.resolvedIssuerAddress).toBeUndefined();
  });

  it("preserves all other env fields", async () => {
    const { createPublicClient } = await import("viem");
    const mockGetEnsAddress = vi.fn().mockResolvedValue(null);
    (createPublicClient as ReturnType<typeof vi.fn>).mockReturnValue({
      getEnsAddress: mockGetEnsAddress,
    });

    const result = await resolveEnsNames(baseEnv);
    expect(result.resourceUrl).toBe(baseEnv.resourceUrl);
    expect(result.lemmaApiKey).toBe(baseEnv.lemmaApiKey);
    expect(result.agentId).toBe(baseEnv.agentId);
  });
});
