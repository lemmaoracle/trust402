import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateEnv } from "./env.js";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.RESOURCE_URL = "http://localhost:3000";
  process.env.LEMMA_API_KEY = "test-api-key";
  process.env.AGENT_PRIVATE_KEY = "0xacbdef0123456789";
  process.env.HOLDER_PUBLIC_KEY = "0xpubkey";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("validateEnv", () => {
  it("exits on missing required env var", () => {
    delete process.env.RESOURCE_URL;
    expect(() => validateEnv()).toThrow();
  });

  it("returns ENS subname defaults when no AGENT_ID or AGENT_ENS_NAME set", () => {
    delete process.env.AGENT_ID;
    delete process.env.AGENT_ENS_NAME;
    delete process.env.ISSUER_ID;
    delete process.env.ISSUER_ENS_NAME;

    const env = validateEnv();
    expect(env.agentId).toBe("agent.trust402.eth");
    expect(env.issuerId).toBe("issuer.trust402.eth");
    expect(env.agentEnsName).toBe("agent.trust402.eth");
    expect(env.issuerEnsName).toBe("issuer.trust402.eth");
  });

  it("AGENT_ID takes precedence over ENS default", () => {
    process.env.AGENT_ID = "did:trust402:my-agent";
    delete process.env.AGENT_ENS_NAME;

    const env = validateEnv();
    expect(env.agentId).toBe("did:trust402:my-agent");
  });

  it("AGENT_ENS_NAME is used when AGENT_ID is not set", () => {
    delete process.env.AGENT_ID;
    process.env.AGENT_ENS_NAME = "custom.agent.eth";

    const env = validateEnv();
    expect(env.agentId).toBe("custom.agent.eth");
    expect(env.agentEnsName).toBe("custom.agent.eth");
  });

  it("AGENT_ID overrides AGENT_ENS_NAME", () => {
    process.env.AGENT_ID = "did:trust402:override-agent";
    process.env.AGENT_ENS_NAME = "custom.agent.eth";

    const env = validateEnv();
    expect(env.agentId).toBe("did:trust402:override-agent");
    expect(env.agentEnsName).toBe("custom.agent.eth");
  });

  it("initializes resolved addresses as undefined", () => {
    const env = validateEnv();
    expect(env.resolvedAgentAddress).toBeUndefined();
    expect(env.resolvedIssuerAddress).toBeUndefined();
  });

  it("reads BASE_SEPOLIA_RPC_URL when set", () => {
    process.env.BASE_SEPOLIA_RPC_URL = "https://base-sepolia.example.com";
    const env = validateEnv();
    expect(env.baseSepoliaRpcUrl).toBe("https://base-sepolia.example.com");
  });

  it("reads ETHEREUM_RPC_URL when set", () => {
    process.env.ETHEREUM_RPC_URL = "https://ethereum.example.com";
    const env = validateEnv();
    expect(env.ethereumRpcUrl).toBe("https://ethereum.example.com");
  });

  it("returns undefined for ETHEREUM_RPC_URL when not set", () => {
    delete process.env.ETHEREUM_RPC_URL;
    const env = validateEnv();
    expect(env.ethereumRpcUrl).toBeUndefined();
  });
});
