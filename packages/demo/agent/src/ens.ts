import * as R from "ramda";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import type { EnvConfig } from "./env.js";

const PUBLIC_MAINNET_RPC = "https://ethereum.publicnode.com";

export const resolveEnsName = async (
  rpcUrl: string,
  ensName: string,
): Promise<string | undefined> => {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });

  const address = await client.getEnsAddress({ name: ensName });
  return address ?? undefined;
};

const resolveOne = async (
  rpcUrl: string,
  ensName: string,
): Promise<string | undefined> => {
  const address = await resolveEnsName(rpcUrl, ensName);
  return address;
};

export const resolveEnsNames = async (env: EnvConfig): Promise<EnvConfig> => {
  const rpcUrl = R.defaultTo(PUBLIC_MAINNET_RPC, env.ethereumRpcUrl);

  const resolvedAgentAddress = await resolveOne(rpcUrl, env.agentEnsName).catch(() => undefined);
  const resolvedIssuerAddress = await resolveOne(rpcUrl, env.issuerEnsName).catch(() => undefined);

  return R.mergeRight(env, { resolvedAgentAddress, resolvedIssuerAddress });
};
