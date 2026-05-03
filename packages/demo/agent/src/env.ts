/**
 * Environment variable validation for the demo agent.
 *
 * Validates required environment variables with clear error messages.
 */

import * as R from "ramda";

type RequiredVar = Readonly<{ name: string; key: string }>;

export type EnvConfig = Readonly<{
  resourceUrl: string;
  lemmaApiKey: string;
  agentPrivateKey: string;
  artifactPath: string;
  maxSpend: number;
  lemmaApiBase: string;
  agentId: string;
  issuerId: string;
  holderPublicKey: string;
  baseSepoliaRpcUrl: string | undefined;
  keeperhubWebhookUrl: string | undefined;
  agentEnsName: string;
  issuerEnsName: string;
  resolvedAgentAddress: string | undefined;
  resolvedIssuerAddress: string | undefined;
}>;

const REQUIRED_VARS: ReadonlyArray<RequiredVar> = [
  { name: "Demo resource server URL", key: "RESOURCE_URL" },
  { name: "Lemma API key", key: "LEMMA_API_KEY" },
  { name: "Agent wallet private key", key: "AGENT_PRIVATE_KEY" },
  { name: "Holder public key (secp256k1)", key: "HOLDER_PUBLIC_KEY" },
];

const isVarMissing = (v: RequiredVar): boolean =>
  R.isNil(process.env[v.key]) || R.isEmpty(process.env[v.key]);

const missingVars = (vars: ReadonlyArray<RequiredVar>): ReadonlyArray<RequiredVar> =>
  R.filter(isVarMissing, vars);

const formatMissing = (missing: ReadonlyArray<RequiredVar>): string =>
  R.map(
    (v: RequiredVar) => `  - ${v.name} (${v.key})`,
    missing,
  ).join("\n");

export const validateEnv = (): EnvConfig => {
  const missing = missingVars(REQUIRED_VARS);

  R.isNotEmpty(missing)
    ? (console.error("Missing required environment variables:\n" + formatMissing(missing)), process.exit(1))
    : undefined;

  return {
    resourceUrl: process.env.RESOURCE_URL!,
    lemmaApiKey: process.env.LEMMA_API_KEY!,
    agentPrivateKey: process.env.AGENT_PRIVATE_KEY!,
    artifactPath: process.env.ARTIFACT_PATH ?? "./artifact.json",
    maxSpend: Number(process.env.MAX_SPEND ?? 1000),
    lemmaApiBase: process.env.LEMMA_API_BASE ?? "https://workers.lemma.workers.dev",
    agentId: process.env.AGENT_ID ?? process.env.AGENT_ENS_NAME ?? "agent.trust402.eth",
    issuerId: process.env.ISSUER_ID ?? process.env.ISSUER_ENS_NAME ?? "issuer.trust402.eth",
    holderPublicKey: process.env.HOLDER_PUBLIC_KEY!,
    baseSepoliaRpcUrl: process.env.BASE_SEPOLIA_RPC_URL,
    keeperhubWebhookUrl: process.env.KEEPERHUB_WEBHOOK_URL,
    agentEnsName: process.env.AGENT_ENS_NAME ?? "agent.trust402.eth",
    issuerEnsName: process.env.ISSUER_ENS_NAME ?? "issuer.trust402.eth",
    resolvedAgentAddress: undefined,
    resolvedIssuerAddress: undefined,
  };
};
