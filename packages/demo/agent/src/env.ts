/**
 * Environment variable validation for the demo agent.
 *
 * Task 6.1: Validates required environment variables with clear error messages.
 */

import * as R from "ramda";

type RequiredVar = Readonly<{ name: string; key: string }>;

type EnvConfig = Readonly<{
  resourceUrl: string;
  lemmaApiKey: string;
  agentPrivateKey: string;
  artifactPath: string;
  maxSpend: number;
  lemmaApiBase: string;
}>;

const REQUIRED_VARS: ReadonlyArray<RequiredVar> = [
  { name: "Demo resource server URL", key: "RESOURCE_URL" },
  { name: "Lemma API key", key: "LEMMA_API_KEY" },
  { name: "Agent wallet private key", key: "AGENT_PRIVATE_KEY" },
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
  };
};

export type { EnvConfig };
